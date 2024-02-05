from sqlalchemy import Column, Integer, String, create_engine, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import ipaddress

DATABASE_URI = 'sqlite:///instance/overburn.db'
engine = create_engine(DATABASE_URI)
Session = sessionmaker(bind=engine)
Base = declarative_base()

class PageHit(Base):
    __tablename__ = 'page_hit'
    id = Column(Integer, primary_key=True)
    page_url = Column(String(500))
    hit_type = Column(String(50))  # 'image', 'valid', 'invalid', 'suspicious'
    visit_datetime = Column(DateTime, default=datetime.utcnow)
    visitor_id = Column(String(100))  # IP or session ID
    referrer_url = Column(String(500))  # URL of the referring page
    user_agent = Column(String(500))  # String representing the client's user agent

def init_db():
    Base.metadata.create_all(engine)

def is_valid_ip(ip_addr):
    try:
        ipaddress.ip_address(ip_addr)
        return True
    except ValueError:
        return False

def track_page(request, response):
    page_url = request.path
    visitor_id = request.headers.get('X-Forwarded-For', request.remote_addr)
    referrer_url = request.referrer or ''
    user_agent = request.user_agent.string or ''

    if not is_valid_ip(visitor_id):
        hit_type = 'suspicious'
    elif ':NaN:' in user_agent:
        hit_type = 'suspicious'
    elif ':NaN:' in referrer_url:
        hit_type = 'suspicious'
    elif response.status_code == 404:
        hit_type = 'invalid'
    elif page_url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
        hit_type = 'image'
    else:
        hit_type = 'valid'

    with Session() as session:
        new_hit = PageHit(page_url=page_url, hit_type=hit_type, visitor_id=visitor_id,referrer_url=referrer_url,user_agent=user_agent)
        session.add(new_hit)
        session.commit()

    return response


def fix_db_error():
    # Database connection
    DATABASE_URI = 'sqlite:///instance/overburn.db'
    engine = create_engine(DATABASE_URI)
    Session = sessionmaker(bind=engine)

    # Renaming the table
    old_table_name = 'pagehits'
    new_table_name = 'page_hit'

    # Query to select all records from the old table
    with Session() as session:
        result = session.execute(f"SELECT * FROM {old_table_name}")

        # Insert records into the new table
        for row in result.fetchall():
            page_hit = PageHit(
                page_url=row['page_url'],
                hit_type=row['hit_type'],
                visit_datetime=datetime.strptime(row['visit_datetime'], '%Y-%m-%d %H:%M:%S'),
                visitor_id=row['visitor_id'],
                referrer_url=row['referrer_url'],
                user_agent=row['user_agent']
            )
            session.add(page_hit)

        # Commit the changes and close the session
        session.commit()
        print(f"Data loaded into the '{new_table_name}' table successfully.")

        # Drop the old table
        session.execute(f"DROP TABLE {old_table_name}")
        session.commit()
        print(f"The '{old_table_name}' table has been dropped.")
