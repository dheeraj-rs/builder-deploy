import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  project_id: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
