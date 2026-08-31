from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import AthleteProfile, LookupGroup, LookupItem, Transaction, User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        query = select(User).where(User.id == user_id)
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
        query = select(AthleteProfile).where(AthleteProfile.handle == handle)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int) -> AthleteProfile | None:
        query = select(AthleteProfile).where(AthleteProfile.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, profile: AthleteProfile) -> AthleteProfile:
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def get_monthly_leaderboard(self, limit: int = 10) -> list[dict]:
        """Consulta agregada del Top mensual basada en transacciones exitosas de shakes."""
        # Se puede consultar la vista view_monthly_athlete_leaderboard o query select() directa
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


class LookupRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_active_groups_with_items(self) -> list[LookupGroup]:
        query = select(LookupGroup).where(LookupGroup.is_active.is_(True))
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
