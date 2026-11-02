const express = require("express");
const mongoose = require("mongoose");
const Graph = require("../models/Graph");

const router = express.Router();

// POST /api/graphs  -> save a graph
router.post("/", async (req, res) => {
  try {
    const { title, studentId, points, precisionStep, xLabel, yLabel, xScale, yScale } = req.body;
    if (!title || !studentId) {
      return res.status(400).json({ error: "title and studentId are required." });
    }
    if (!Array.isArray(points) || !points.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))) {
      return res.status(400).json({ error: "points must be an array of {x, y} numbers." });
    }
    const badScale = [xScale, yScale].some((v) => v !== undefined && !(Number.isFinite(v) && v > 0));
    if (badScale) return res.status(400).json({ error: "Scales must be numbers greater than 0." });
    const graph = await Graph.create({ title, studentId, points, precisionStep, xLabel, yLabel, xScale, yScale });
    res.status(201).json(graph);
  } catch (err) {
    res.status(500).json({ error: "Could not save graph.", detail: err.message });
  }
});

// GET /api/graphs/student/:studentId  -> list a student's graphs (newest first)
router.get("/student/:studentId", async (req, res) => {
  try {
    const graphs = await Graph.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json(graphs);
  } catch (err) {
    res.status(500).json({ error: "Could not list graphs.", detail: err.message });
  }
});

// GET /api/graphs/:id  -> one graph for re-playback
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid graph id." });
    }
    const graph = await Graph.findById(req.params.id);
    if (!graph) return res.status(404).json({ error: "Graph not found." });
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: "Could not load graph.", detail: err.message });
  }
});

module.exports = router;
