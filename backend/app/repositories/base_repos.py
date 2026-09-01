from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import (
    AppVersion,
    AthleteProfile,
    BookingAppointment,
    BookingAvailability,
    BookingService,
    DigitalProduct,
    Goal,
    LookupGroup,
    LookupItem,
    MembershipTier,
    Post,
    Subscription,
    TierBenefit,
    Transaction,
    User,
)


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        query = select(User).options(selectinload(User.athlete_profile)).where(User.id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        query = select(User).where(User.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user


class AthleteRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_handle(self, handle: str) -> AthleteProfile | None:
        query = (
            select(AthleteProfile)
            .options(
                selectinload(AthleteProfile.user),
                selectinload(AthleteProfile.goals),
                selectinload(AthleteProfile.booking_services),
                selectinload(AthleteProfile.tiers).selectinload(MembershipTier.benefits),
                selectinload(AthleteProfile.products),
            )
            .where(AthleteProfile.handle == handle)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int) -> AthleteProfile | None:
        query = (
            select(AthleteProfile)
            .options(
                selectinload(AthleteProfile.user),
                selectinload(AthleteProfile.tiers).selectinload(MembershipTier.benefits),
                selectinload(AthleteProfile.products),
                selectinload(AthleteProfile.booking_services).selectinload(BookingService.availabilities),
            )
            .where(AthleteProfile.user_id == user_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, profile: AthleteProfile) -> AthleteProfile:
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def update(self, profile: AthleteProfile) -> AthleteProfile:
        await self.session.flush()
        return profile

    async def get_monthly_leaderboard(self, limit: int = 10) -> list[dict]:
        query = (
            select(
                AthleteProfile.id.label("athlete_id"),
                AthleteProfile.handle,
                User.full_name.label("athlete_name"),
                User.avatar_url,
                func.coalesce(func.sum(Transaction.shakes_count), 0).label("total_shakes_this_month"),
                func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_raised_this_month"),
            )
            .join(User, AthleteProfile.user_id == User.id)
            .outerjoin(
                Transaction,
                (AthleteProfile.id == Transaction.athlete_id)
                & (Transaction.status_code == 302)
                & (Transaction.transaction_type_code == 201),
            )
            .group_by(AthleteProfile.id, User.id)
            .order_by(func.sum(Transaction.shakes_count).desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        rows = result.all()

        leaderboard = []
        for rank, row in enumerate(rows, start=1):
            leaderboard.append({
                "athlete_id": row.athlete_id,
                "handle": row.handle,
                "athlete_name": row.athlete_name,
                "avatar_url": row.avatar_url,
                "primary_sport": "Deporte General",
                "total_shakes_this_month": int(row.total_shakes_this_month or 0),
                "total_raised_this_month": row.total_raised_this_month or 0,
                "ranking_position": rank,
            })
        return leaderboard


class DashboardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_metrics_30d(self, athlete_id: int) -> dict:
        since_date = datetime.now() - timedelta(days=30)
        
        # Transacciones de los últimos 30 días
        query = (
            select(
                Transaction.transaction_type_code,
                func.sum(Transaction.gross_amount).label("total_gross"),
                func.sum(Transaction.shakes_count).label("total_shakes"),
            )
            .where(
                Transaction.athlete_id == athlete_id,
                Transaction.status_code == 302,
                Transaction.created_at >= since_date,
            )
            .group_by(Transaction.transaction_type_code)
        )
        result = await self.session.execute(query)
        rows = result.all()

        earnings_by_type = {"shakes": Decimal("0.0"), "memberships": Decimal("0.0"), "shop": Decimal("0.0"), "bookings": Decimal("0.0")}
        total_earnings = Decimal("0.0")
        total_shakes = 0

        for r in rows:
            amount = r.total_gross or Decimal("0.0")
            total_earnings += amount
            if r.transaction_type_code == 201:
                earnings_by_type["shakes"] = amount
                total_shakes += int(r.total_shakes or 0)
            elif r.transaction_type_code == 202:
                earnings_by_type["memberships"] = amount
            elif r.transaction_type_code == 203:
                earnings_by_type["shop"] = amount
            elif r.transaction_type_code == 204:
                earnings_by_type["bookings"] = amount

        # Miembros activos en tiers del atleta
        m_query = (
            select(func.count(Subscription.id), func.sum(MembershipTier.monthly_price))
            .join(MembershipTier, Subscription.tier_id == MembershipTier.id)
            .where(MembershipTier.athlete_id == athlete_id, Subscription.status == "active")
        )
        m_result = await self.session.execute(m_query)
        m_row = m_result.first()
        active_members = m_row[0] if m_row else 0
        mrr = m_row[1] or Decimal("0.0") if m_row else Decimal("0.0")

        return {
            "total_earnings_30d": total_earnings,
            "total_shakes_30d": total_shakes,
            "active_members_count": active_members,
            "monthly_recurring_revenue": mrr,
            "earnings_by_type": earnings_by_type,
            "currency": "USD",
        }


class GoalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_athlete_id(self, athlete_id: int) -> list[Goal]:
        query = select(Goal).where(Goal.athlete_id == athlete_id).order_by(Goal.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_active_goal(self, athlete_id: int) -> Goal | None:
        query = select(Goal).where(Goal.athlete_id == athlete_id, Goal.is_active.is_(True)).limit(1)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_goal(self, goal: Goal) -> Goal:
        # Desactivar otras metas previas si esta es activa
        if goal.is_active:
            prev_active = await self.get_active_goal(goal.athlete_id)
            if prev_active:
                prev_active.is_active = False

        self.session.add(goal)
        await self.session.flush()
        return goal


class MembershipRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_athlete_id(self, athlete_id: int) -> list[MembershipTier]:
        query = (
            select(MembershipTier)
            .options(selectinload(MembershipTier.benefits))
            .where(MembershipTier.athlete_id == athlete_id, MembershipTier.is_active.is_(True))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create_tier(self, tier: MembershipTier, benefits_text: list[str]) -> MembershipTier:
        self.session.add(tier)
        await self.session.flush()
        for b_text in benefits_text:
            benefit = TierBenefit(tier_id=tier.id, benefit_text=b_text)
            self.session.add(benefit)
        await self.session.flush()
        return tier


class ShopRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_athlete_id(self, athlete_id: int) -> list[DigitalProduct]:
        query = select(DigitalProduct).where(DigitalProduct.athlete_id == athlete_id, DigitalProduct.is_active.is_(True))
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create_product(self, product: DigitalProduct) -> DigitalProduct:
        self.session.add(product)
        await self.session.flush()
        return product


class BookingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_services_by_athlete(self, athlete_id: int) -> list[BookingService]:
        query = (
            select(BookingService)
            .options(selectinload(BookingService.availabilities))
            .where(BookingService.athlete_id == athlete_id, BookingService.is_active.is_(True))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_service_by_id(self, service_id: int) -> BookingService | None:
        query = select(BookingService).where(BookingService.id == service_id, BookingService.is_active.is_(True))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_service(self, service: BookingService, slots: list[dict]) -> BookingService:
        self.session.add(service)
        await self.session.flush()
        for s in slots:
            avail = BookingAvailability(
                booking_service_id=service.id,
                day_of_week=s["day_of_week"],
                start_time=s["start_time"],
                end_time=s["end_time"],
            )
            self.session.add(avail)
        await self.session.flush()
        return service

    async def get_appointments_by_athlete(self, athlete_id: int) -> list[dict]:
        query = (
            select(
                BookingAppointment.id,
                User.full_name.label("supporter_name"),
                BookingService.title.label("service_title"),
                BookingAppointment.start_time,
                BookingAppointment.end_time,
                BookingAppointment.meeting_link,
                BookingAppointment.status_code,
            )
            .join(BookingService, BookingAppointment.booking_service_id == BookingService.id)
            .join(User, BookingAppointment.supporter_id == User.id)
            .where(BookingService.athlete_id == athlete_id)
            .order_by(BookingAppointment.start_time.asc())
        )
        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]


class ReferralRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_referral_summary(self, athlete_id: int, referral_code: str) -> dict:
        # Atletas que se registraron con su referred_by_id
        query = (
            select(
                User.full_name.label("name"),
                AthleteProfile.handle,
                AthleteProfile.created_at.label("joined_date"),
                func.coalesce(func.sum(Transaction.shakes_count), 0).label("shakes_count"),
            )
            .join(User, AthleteProfile.user_id == User.id)
            .outerjoin(
                Transaction,
                (AthleteProfile.id == Transaction.athlete_id) & (Transaction.status_code == 302),
            )
            .where(AthleteProfile.referred_by_id == athlete_id)
            .group_by(AthleteProfile.id, User.id)
        )
        result = await self.session.execute(query)
        rows = result.all()

        referred_athletes = []
        total_shakes = 0
        for r in rows:
            shakes = int(r.shakes_count or 0)
            total_shakes += shakes
            # Comisión estimada de $0.15 USD por shake en programa de referidos
            comm = Decimal(str(round(shakes * 0.15, 2)))
            referred_athletes.append({
                "name": r.name,
                "handle": r.handle,
                "joined_date": r.joined_date,
                "shakes_count": shakes,
                "earned_commission": comm,
                "status": "Activo" if shakes > 0 else "Pendiente",
            })

        total_comm = Decimal(str(round(total_shakes * 0.15, 2)))
        return {
            "referral_link": f"https://buymeashake.fit/join?ref={referral_code}",
            "invited_athletes_count": len(referred_athletes),
            "active_athletes_count": len([a for a in referred_athletes if a["shakes_count"] > 0]),
            "total_shakes_generated": total_shakes,
            "total_earned_commission": total_comm,
            "referred_athletes": referred_athletes,
        }


class LookupRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_active_groups_with_items(self) -> list[LookupGroup]:
        query = (
            select(LookupGroup)
            .options(selectinload(LookupGroup.items))
            .where(LookupGroup.is_active.is_(True))
            .order_by(LookupGroup.code.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_items_by_group_code(self, group_code: int) -> list[LookupItem]:
        query = (
            select(LookupItem)
            .join(LookupGroup, LookupItem.lookup_group_id == LookupGroup.id)
            .where(LookupGroup.code == group_code, LookupItem.is_active.is_(True))
            .order_by(LookupItem.sort_order.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())


class AppVersionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_latest_by_platform(self, platform: str) -> AppVersion | None:
        query = (
            select(AppVersion)
            .where(AppVersion.platform == platform, AppVersion.is_active.is_(True))
            .order_by(AppVersion.version_code.desc())
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()


class PostRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_athlete_id(self, athlete_id: int) -> list[Post]:
        query = (
            select(Post)
            .where(Post.athlete_id == athlete_id)
            .order_by(Post.published_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_public_by_athlete_id(self, athlete_id: int) -> list[Post]:
        query = (
            select(Post)
            .where(Post.athlete_id == athlete_id, Post.access_type == "public")
            .order_by(Post.published_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, post: Post) -> Post:
        self.session.add(post)
        await self.session.flush()
        return post


class SupporterRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_dashboard_summary(self, athlete_id: int) -> dict:
        since_date = datetime.now() - timedelta(days=30)
        base_filter = (
            Transaction.athlete_id == athlete_id,
            Transaction.status_code == 302,
            Transaction.transaction_type_code == 201,
        )

        items_query = (
            select(
                Transaction.id,
                User.full_name,
                Transaction.shakes_count,
                Transaction.gross_amount,
                Transaction.currency,
                Transaction.supporter_message,
                Transaction.is_anonymous,
                Transaction.created_at,
            )
            .join(User, Transaction.supporter_id == User.id)
            .where(*base_filter)
            .order_by(Transaction.created_at.desc())
            .limit(50)
        )
        rows = (await self.session.execute(items_query)).all()

        count_query = select(func.count(Transaction.id)).where(*base_filter)
        supporter_count = (await self.session.execute(count_query)).scalar() or 0

        last_30_query = select(func.coalesce(func.sum(Transaction.gross_amount), 0)).where(
            *base_filter,
            Transaction.created_at >= since_date,
        )
        last_30_total = (await self.session.execute(last_30_query)).scalar() or Decimal("0")

        all_time_query = select(func.coalesce(func.sum(Transaction.gross_amount), 0)).where(*base_filter)
        all_time_total = (await self.session.execute(all_time_query)).scalar() or Decimal("0")

        items = []
        for row in rows:
            name = "Anónimo" if row.is_anonymous else row.full_name
            items.append({
                "id": row.id,
                "supporter_name": name,
                "shakes_count": int(row.shakes_count or 0),
                "gross_amount": row.gross_amount or Decimal("0"),
                "currency": row.currency,
                "supporter_message": row.supporter_message,
                "is_anonymous": row.is_anonymous,
                "created_at": row.created_at,
            })

        return {
            "supporter_count": int(supporter_count),
            "last_30_days_total": last_30_total,
            "all_time_total": all_time_total,
            "currency": "USD",
            "items": items,
        }
