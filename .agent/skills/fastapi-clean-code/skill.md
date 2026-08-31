fastapi-clean-code
Design, implement, and refactor clean, modular, and sustainable FastAPI applications following a layered architecture. Use when creating FastAPI endpoints, building services and repositories, designing SQLAlchemy 2.0 async models, defining Pydantic v2 schemas, handling exceptions, or refactoring existing FastAPI code.

Instructions
fastapi-clean-code
Expert guidelines and patterns for building scalable, clean, and sustainable backend services with FastAPI, modern Python (3.10+), Pydantic v2, and asynchronous SQLAlchemy 2.0.

When to Use
Use this skill in the following scenarios:

Creating new FastAPI endpoints, routers, or entire API features from scratch.
Designing or updating database models using SQLAlchemy 2.0 with asynchronous drivers.
Structuring business logic in dedicated service layers and isolating data access with repository patterns.
Defining request/response contracts and data validation using Pydantic v2 models.
Implementing centralized exception handling, custom errors, and standardized response formats.
Refactoring existing FastAPI code to adhere to clean code principles, modularity, and separation of concerns.
Architecture and Layered Structure
Maintain a strict separation of concerns across distinct layers to ensure testability and maintainability:

app/
├── api/
│   ├── dependencies.py       # FastAPI dependency injection providers (db sessions, auth)
│   └── v1/
│       ├── endpoints/        # Router definitions per domain entity
│       └── api.py            # Aggregator for v1 routers
├── core/
│   ├── config.py             # App settings via pydantic-settings
│   ├── database.py           # Async engine, sessionmaker, and Base metadata
│   └── exceptions.py         # Custom domain exceptions and global handlers
├── models/                   # SQLAlchemy ORM mapped models (declarative)
├── schemas/                  # Pydantic v2 schemas (Request, Response, InDB)
├── repositories/             # Data access layer (async SQLAlchemy queries)
├── services/                 # Business logic orchestration layer
└── main.py                   # FastAPI app initialization and middleware
Layer Responsibilities and Workflow
1. Data Models (models/)
Use modern SQLAlchemy 2.0 Mapped and mapped_column annotations.
Keep ORM models free from business logic and presentation concerns.
Always use asynchronous-compatible types and relationships.
2. Schemas (schemas/)
Define strict Pydantic v2 models with model_config = ConfigDict(from_attributes=True).
Separate schemas by role: ItemCreate, ItemUpdate, ItemRead, ItemInDB.
Use native modern Python type annotations (str | None, list[int]).
Use @field_validator and @model_validator for custom validation logic.
3. Repository Layer (repositories/)
Encapsulate all database interactions within repository classes.
Receive an AsyncSession injected via constructor.
Use SQLAlchemy 2.0-style queries (select(), update(), delete()).
Return ORM models or collections; do not handle HTTP concepts here.
4. Service Layer (services/)
Encapsulate business rules, validations, and orchestration.
Inject repository instances into service classes.
Raise custom domain exceptions (defined in core/exceptions.py) when rules are violated.
Keep services independent of HTTP request/response objects (Request, Response, status codes).
5. Routers / API Endpoints (api/v1/endpoints/)
Keep routers thin: receive inputs, call service methods, and return response schemas.
Use status_code, response_model, and OpenAPI metadata in decorators.
Inject services and dependencies using Depends().
Core Implementation Standards
Asynchronous SQLAlchemy 2.0 Pattern
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(default=True)
Dependency Injection for Database Sessions
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
Centralized Exception Handling
Define custom application exceptions inheriting from a base domain exception.
Register global exception handlers on the FastAPI application instance.
Return structured error envelopes containing code, message, and optional details.
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class EntityNotFoundError(Exception):
    def __init__(self, entity_name: str, entity_id: int | str):
        self.entity_name = entity_name
        self.entity_id = entity_id
        super().__init__(f"{entity_name} with id {entity_id} not found.")

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "ENTITY_NOT_FOUND",
                    "message": str(exc),
                    "details": {"entity": exc.entity_name, "id": exc.entity_id},
                }
            },
        )
Gotchas and Best Practices
Avoid performing database operations directly inside router endpoints; always delegate to repositories.
Never mix sync database drivers with async event loops; always use asynchronous drivers like asyncpg or aiomysql.
Ensure transactions are properly committed or rolled back using the async session context manager.
Avoid circular imports by keeping schemas and models strictly decoupled.
Use Pydantic v2 ConfigDict rather than inner class Config.
Use Annotated[T, Depends(...)] for clean and reusable dependency declarations in endpoint signatures.