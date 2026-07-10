from database.connection import Base, engine

# Import semua model
from database.models import *

def create_tables():
    print("Creating REFCON database tables...")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully!")


if __name__ == "__main__":
    create_tables()