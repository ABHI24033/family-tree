import mongoose from "mongoose";

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "other"
  },
  birthYear: {
    type: Number
  },
  photoUrl: {
    type: String
  },
  father: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    default: null
  },
  mother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    default: null
  },
  spouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    default: null
  },

  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person"
  }]
}, {
  timestamps: true
});

export default mongoose.models.Person || mongoose.model("Person", personSchema);
