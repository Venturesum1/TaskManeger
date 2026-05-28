import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMeetingDoc extends Document {
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  participants: Types.ObjectId[];
  googleMeetLink: string;
  organizer: Types.ObjectId;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeetingDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    googleMeetLink: { type: String, default: '' },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MeetingSchema.index({ date: 1 });

MeetingSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const Meeting: Model<IMeetingDoc> =
  mongoose.models.Meeting || mongoose.model<IMeetingDoc>('Meeting', MeetingSchema);
export default Meeting;
