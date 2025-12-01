import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  description?: string;
  category: string;
  thumbnail_url?: string;
  html_content: string;
  css_content?: string;
  js_content?: string;
  is_active: boolean;
  created_at: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'general' },
    thumbnail_url: { type: String, default: '' },
    html_content: { type: String, required: true },
    css_content: { type: String, default: '' },
    js_content: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default mongoose.models.Template ||
  mongoose.model<ITemplate>('Template', TemplateSchema);
