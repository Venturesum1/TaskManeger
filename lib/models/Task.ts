import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITaskDoc extends Document {
  title: string;
  description: string;
  owner: Types.ObjectId;
  priority: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'delayed';
  startDate?: Date;
  endDate?: Date;
  milestone: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITaskDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'blocked', 'delayed'],
      default: 'not_started',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    milestone: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1 });
TaskSchema.index({ owner: 1 });
TaskSchema.index({ endDate: 1 });

TaskSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const Task: Model<ITaskDoc> = mongoose.models.Task || mongoose.model<ITaskDoc>('Task', TaskSchema);
export default Task;
