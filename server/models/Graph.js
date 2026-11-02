const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  { x: { type: Number, required: true }, y: { type: Number, required: true } },
  { _id: false }
);

const graphSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  studentId: { type: String, required: true, trim: true, index: true },
  points: { type: [pointSchema], default: [] },
  precisionStep: { type: Number, default: 1, min: 0 },
  xLabel: { type: String, default: "X", trim: true, maxlength: 60 },
  yLabel: { type: String, default: "Y", trim: true, maxlength: 60 },
  xScale: { type: Number, default: 1, min: [1e-9, "xScale must be greater than 0"] },
  yScale: { type: Number, default: 1, min: [1e-9, "yScale must be greater than 0"] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Graph", graphSchema);
