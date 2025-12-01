import mongoose, { Schema, Document } from 'mongoose';

export interface IDeployment extends Document {
  project_id: mongoose.Types.ObjectId;
  vercel_deployment_id: string;
  url: string;
  status: 'queued' | 'building' | 'deploying' | 'success' | 'error';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

const DeploymentSchema = new Schema<IDeployment>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    vercel_deployment_id: { type: String, required: true },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'building', 'deploying', 'success', 'error'],
      default: 'queued',
    },
    error_message: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.models.Deployment ||
  mongoose.model<IDeployment>('Deployment', DeploymentSchema);
