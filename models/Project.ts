import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  user_id: string;
  name: string;
  description?: string;
  template_id?: string;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  status: 'draft' | 'published' | 'deployed';
  vercel_deployment_id?: string;
  vercel_url?: string;
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    template_id: { type: String },
    html_content: { type: String, default: '' },
    css_content: { type: String, default: '' },
    js_content: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'deployed'],
      default: 'draft',
    },
    vercel_deployment_id: { type: String },
    vercel_url: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.models.Project ||
  mongoose.model<IProject>('Project', ProjectSchema);
