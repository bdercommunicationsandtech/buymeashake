import asyncio
import os
from dotenv import load_dotenv
import aiomysql

load_dotenv()

DB_HOST = os.getenv("HOST")
DB_USER = os.getenv("USER_DB")
DB_PASS = os.getenv("PASSWORD")
DB_NAME = os.getenv("DATABASE")
DB_PORT = int(os.getenv("PORT_DB", 3306))

async def run_migration():
    print(f"Connecting to {DB_HOST}...")
    conn = await aiomysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        autocommit=True
    )
    async with conn.cursor() as cur:
        print("1. Creating athlete_disciplines table...")
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS athlete_disciplines (
                athlete_id BIGINT UNSIGNED NOT NULL,
                discipline_item_id BIGINT UNSIGNED NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (athlete_id, discipline_item_id),
                FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
                FOREIGN KEY (discipline_item_id) REFERENCES lookup_items(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        print("2. Migrating existing data...")
        await cur.execute("""
            INSERT IGNORE INTO athlete_disciplines (athlete_id, discipline_item_id, is_primary)
            SELECT id, primary_sport_item_id, TRUE
            FROM athlete_profiles
            WHERE primary_sport_item_id IS NOT NULL;
        """)
        
        print("3. Finding the foreign key name for primary_sport_item_id...")
        await cur.execute("""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = %s 
              AND TABLE_NAME = 'athlete_profiles' 
              AND COLUMN_NAME = 'primary_sport_item_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL;
        """, (DB_NAME,))
        fk_result = await cur.fetchone()
        
        if fk_result:
            fk_name = fk_result[0]
            print(f"Dropping foreign key {fk_name}...")
            await cur.execute(f"ALTER TABLE athlete_profiles DROP FOREIGN KEY {fk_name};")
        
        print("4. Checking if column exists before dropping...")
        await cur.execute("""
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
              AND TABLE_NAME = 'athlete_profiles' 
              AND COLUMN_NAME = 'primary_sport_item_id';
        """, (DB_NAME,))
        col_result = await cur.fetchone()
        
        if col_result:
            print("Dropping column primary_sport_item_id...")
            await cur.execute("ALTER TABLE athlete_profiles DROP COLUMN primary_sport_item_id;")
            
        print("Migration completed successfully!")
        
    conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
