"""Add time_from and time_to fields to tasks

Revision ID: add_time_fields_001
Revises: 4d368f6db782
Create Date: 2024-09-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_time_fields_001'
down_revision = '4d368f6db782'
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем новые поля
    op.add_column('tasks', sa.Column('time_from', sa.Time(), nullable=True))
    op.add_column('tasks', sa.Column('time_to', sa.Time(), nullable=True))
    
    # Копируем данные из старого поля time в time_from
    op.execute("UPDATE tasks SET time_from = time WHERE time_from IS NULL")
    
    # Устанавливаем time_to на час позже time_from по умолчанию
    op.execute("UPDATE tasks SET time_to = time_from + INTERVAL '1 hour' WHERE time_to IS NULL")
    
    # Делаем поля обязательными
    op.alter_column('tasks', 'time_from', nullable=False)
    op.alter_column('tasks', 'time_to', nullable=False)
    
    # Удаляем старое поле time
    op.drop_column('tasks', 'time')


def downgrade():
    # Добавляем обратно поле time
    op.add_column('tasks', sa.Column('time', sa.Time(), nullable=True))
    
    # Копируем данные из time_from в time
    op.execute("UPDATE tasks SET time = time_from WHERE time IS NULL")
    
    # Делаем поле обязательным
    op.alter_column('tasks', 'time', nullable=False)
    
    # Удаляем новые поля
    op.drop_column('tasks', 'time_to')
    op.drop_column('tasks', 'time_from')