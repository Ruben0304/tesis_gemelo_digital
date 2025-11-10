"""
FastAPI application with GraphQL endpoint using Strawberry
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
from contextlib import asynccontextmanager

from app.schema import schema
from app.config import settings
from app.database import get_database, close_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    """
    # Startup
    print("🚀 Starting Digital Twin GraphQL API...")
    get_database()  # Initialize database connection
    yield
    # Shutdown
    print("👋 Shutting down Digital Twin GraphQL API...")
    close_database()


# Create FastAPI application
app = FastAPI(
    title="Digital Twin GraphQL API",
    description="GraphQL API for photovoltaic microgrid digital twin system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create GraphQL router
graphql_app = GraphQLRouter(
    schema,
    graphiql=True,  # Enable GraphiQL interface in development
)

# Mount GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Digital Twin GraphQL API",
        "version": "1.0.0",
        "graphql_endpoint": "/graphql",
        "graphiql_interface": "/graphql (in browser)",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = get_database()
        # Test database connection
        db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
