import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  videoUrl: {
    type: String,
    required: true
  },

  thumbnailUrl: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["PROCESSING", "READY", "FAILED"],
    default: "PROCESSING"
  }

}, {
  timestamps: true
});

const Video = mongoose.model("Video", videoSchema);

export default Video;