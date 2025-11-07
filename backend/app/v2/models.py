from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    TIMESTAMP,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector  # pgvector 타입 임포트
import datetime
from app.db import Base

EMBEDDING_DIM = 1024  # dragonkue/BGE-m3-ko outputs 1024-d vectors


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    categories = relationship("Category", back_populates="owner")
    whitelists = relationship("Whitelist", back_populates="owner")
    feedback_logs = relationship("FeedbackLog", back_populates="owner")


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    embedding = Column(Vector(EMBEDDING_DIM))  # 벡터 타입 정의
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="categories")
    feedback_logs = relationship("FeedbackLog", back_populates="category")


class Whitelist(Base):
    __tablename__ = "whitelists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text_content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    __table_args__ = (
        UniqueConstraint("user_id", "text_content", name="_user_text_uc"),
    )  # UNIQUE 제약조건 추가

    owner = relationship("User", back_populates="whitelists")


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text_content = Column(Text, nullable=False)
    text_embedding = Column(Vector(EMBEDDING_DIM))
    feedback_type = Column(String(10), nullable=False)  # CHECK 제약은 Alembic에서 설정
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="feedback_logs")
    category = relationship("Category", back_populates="feedback_logs")
