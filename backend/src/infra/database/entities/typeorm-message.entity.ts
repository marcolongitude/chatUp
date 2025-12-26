import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class TypeOrmMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ name: 'receiver_id', type: 'uuid' })
  receiverId: string;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'is_delivered', default: false })
  isDelivered: boolean;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;
}
