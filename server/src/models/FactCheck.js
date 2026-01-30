import mongoose from 'mongoose';

const textSelectionSchema = new mongoose.Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true },
}, { _id: false });

const factCheckSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    scriptVersion: { type: Number, required: true },
    textSelection: { type: textSelectionSchema, required: true },
    type: {
      type: String,
      enum: ['claim', 'question', 'source_needed'],
      default: 'claim',
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'disputed'],
      default: 'pending',
    },
    note: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

factCheckSchema.index({ storyId: 1, scriptVersion: 1 });

const FactCheck = mongoose.model('FactCheck', factCheckSchema);
export default FactCheck;
