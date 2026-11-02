import { useEffect, useRef, useState } from "react";
import { speak, playPointTone, unlockAudio } from "./audio";
import { saveGraph, listStudentGraphs } from "./api";

const round = (n) => Math.round(n * 1e9) / 1e9; // avoids 0.1 + 0.2 float noise
const fmt = (n) => String(round(n));
const positive = (s) => {
  const v = parseFloat(s);
  return Number.isFinite(v) && v > 0 ? v : 1;
};

const HELP =
  "Arrow keys move. Enter plots a point. I sets step size. Q plays quadrant sound. " +
  "R toggles review mode. Zero resets to origin. Backspace removes last point. " +
  "S saves graph. L loads your latest graph. Escape leaves plotting mode. H repeats this help.";

export default function App() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState([]);
  const [step, setStep] = useState(1);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [mode, setMode] = useState("plot"); // plot | review | input
  const [active, setActive] = useState(false); // is plotting mode switched on?
  const [stepInput, setStepInput] = useState("");
  const [status, setStatus] = useState("Set up your graph, then choose Start plotting.");
  const [title, setTitle] = useState("Algebra Practice Graph");
  const [studentId, setStudentId] = useState("student-001");
  const [xName, setXName] = useState("X");
  const [yName, setYName] = useState("Y");
  const [xScale, setXScale] = useState("1");
  const [yScale, setYScale] = useState("1");

  const stepInputRef = useRef(null);
  const areaRef = useRef(null);
  const startBtnRef = useRef(null);

  const xn = xName.trim() || "X";
  const yn = yName.trim() || "Y";
  const xs = positive(xScale);
  const ys = positive(yScale);
  const say = (p) => `${xn}: ${fmt(p.x)}, ${yn}: ${fmt(p.y)}`;

  const announce = (msg) => {
    speak(msg);
    setStatus(msg);
  };

  // ---- plotting mode on/off ----
  const startPlotting = () => {
    unlockAudio(); // the button click is the user gesture browsers require
    setActive(true);
    setMode("plot");
    announce(`Plotting mode on. Cursor at ${say(pos)}. Press H for help, Escape to exit.`);
  };

  const stopPlotting = () => {
    setActive(false);
    setMode("plot");
    announce("Plotting mode off. You can edit settings or navigate the page normally.");
    startBtnRef.current?.focus();
  };

  // move keyboard focus into the plotting area whenever it is active
  useEffect(() => {
    if (active && mode !== "input") areaRef.current?.focus();
  }, [active, mode]);

  useEffect(() => {
    if (mode === "input") stepInputRef.current?.focus();
  }, [mode]);

  // ---- actions ----
  const landmarkTone = (a, b) => {
    const crossed = Math.sign(a.x) !== Math.sign(b.x) || Math.sign(a.y) !== Math.sign(b.y);
    if (crossed) playPointTone(b.x, b.y);
  };

  const move = (dx, dy) => {
    const next = { x: round(pos.x + dx * step), y: round(pos.y + dy * step) };
    setPos(next);
    speak(say(next));
    landmarkTone(pos, next);
  };

  const plot = () => {
    setPoints((p) => [...p, { ...pos }]);
    announce(`Plotted point at ${say(pos)}`);
  };

  const reviewMove = (d) => {
    if (!points.length) return;
    const i = Math.min(points.length - 1, Math.max(0, reviewIndex + d));
    const p = points[i];
    setReviewIndex(i);
    const edge = i === reviewIndex && d !== 0 ? (d > 0 ? " Last point." : " First point.") : "";
    speak(`Point ${i + 1} of ${points.length}: ${xn} is ${fmt(p.x)}, ${yn} is ${fmt(p.y)}.${edge}`);
    playPointTone(p.x, p.y);
  };

  const toggleReview = () => {
    if (mode === "review") {
      setMode("plot");
      return announce("Review mode off. Back to plotting.");
    }
    if (!points.length) return announce("No points to review yet.");
    setMode("review");
    setReviewIndex(0);
    const p = points[0];
    speak(`Review mode on. Point 1 of ${points.length}: ${xn} is ${fmt(p.x)}, ${yn} is ${fmt(p.y)}.`);
    playPointTone(p.x, p.y);
  };

  const save = async () => {
    if (!points.length) return announce("Nothing to save. Plot a point first.");
    announce("Saving graph.");
    try {
      const g = await saveGraph({
        title, studentId, points, precisionStep: step,
        xLabel: xn, yLabel: yn, xScale: xs, yScale: ys,
      });
      announce(`Graph saved with ${g.points.length} points.`);
    } catch (e) {
      announce(`Save failed. ${e.message}`);
    }
  };

  const loadLatest = async () => {
    announce("Loading latest graph.");
    try {
      const list = await listStudentGraphs(studentId);
      if (!list.length) return announce("No saved graphs found for this student.");
      const g = list[0];
      setPoints(g.points);
      setTitle(g.title);
      setStep(g.precisionStep || 1);
      setXName(g.xLabel || "X");
      setYName(g.yLabel || "Y");
      setXScale(String(g.xScale || 1));
      setYScale(String(g.yScale || 1));
      setReviewIndex(0);
      setMode("plot");
      announce(`Loaded ${g.title} with ${g.points.length} points. Press R to review.`);
    } catch (e) {
      announce(`Load failed. ${e.message}`);
    }
  };

  const submitStep = () => {
    const v = parseFloat(stepInput);
    if (!Number.isFinite(v) || v <= 0) return announce("Invalid step. Enter a number greater than zero.");
    setStep(v);
    setMode("plot");
    setStepInput("");
    announce(`Step size set to ${v}`);
  };

  // ---- keyboard controls: ONLY active while the plotting area has focus ----
  const onKey = (e) => {
    if (e.target !== e.currentTarget || mode === "input") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k.startsWith("Arrow") || k === " ") e.preventDefault();

    if (mode === "review") {
      if (k === "ArrowRight") return reviewMove(1);
      if (k === "ArrowLeft") return reviewMove(-1);
      if (k === "r" || k === "R" || k === "Escape") return toggleReview();
      return;
    }

    switch (k) {
      case "ArrowRight": return move(1, 0);
      case "ArrowLeft": return move(-1, 0);
      case "ArrowUp": return move(0, 1);
      case "ArrowDown": return move(0, -1);
      case "Enter": return e.repeat ? undefined : plot();
      case "i": case "I":
        e.preventDefault();
        setMode("input");
        return announce("Enter step size, such as 0.5 or 0.001, then press Enter.");
      case "q": case "Q": return playPointTone(pos.x, pos.y);
      case "r": case "R": return toggleReview();
      case "0": case "Home":
        setPos({ x: 0, y: 0 });
        playPointTone(0, 0);
        return speak(`Reset to origin. ${xn}: 0, ${yn}: 0`);
      case "Backspace":
        if (!points.length) return announce("No points to remove.");
        setPoints((p) => p.slice(0, -1));
        return announce("Removed last point.");
      case "s": case "S": return save();
      case "l": case "L": return loadLatest();
      case "h": case "H": case "?": return announce(HELP);
      case "Escape": return stopPlotting();
      default:
    }
  };

  // ---- visual graph (in grid squares; one square = scale units) ----
  const gp = (p) => ({ x: p.x / xs, y: p.y / ys });
  const gpts = points.map(gp);
  const gpos = gp(pos);
  const extent =
    Math.max(
      10,
      Math.ceil(Math.max(Math.abs(gpos.x), Math.abs(gpos.y), ...gpts.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]))) + 1
    );
  const r = extent / 45;
  const fs = extent / 22;
  const ticks = extent <= 30 ? Array.from({ length: extent * 2 + 1 }, (_, i) => i - extent) : [];
  const activePoint = mode === "review" ? gpts[reviewIndex] : null;

  return (
    <main className="app">
      <h1>Accessible Graphing Platform</h1>
      <p className="hint">
        1. Set up your graph below. 2. Choose Start plotting. 3. Use the keys; H for help, Escape leaves plotting mode.
      </p>

      <fieldset className="setup" disabled={active}>
        <legend>Graph setup {active && "(locked while plotting)"}</legend>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Student ID<input value={studentId} onChange={(e) => setStudentId(e.target.value)} /></label>
        <label>X axis name<input value={xName} placeholder="X" onChange={(e) => setXName(e.target.value)} /></label>
        <label>Y axis name<input value={yName} placeholder="Y" onChange={(e) => setYName(e.target.value)} /></label>
        <label>
          One grid square on X axis equals
          <input value={xScale} inputMode="decimal" onChange={(e) => setXScale(e.target.value)} />
        </label>
        <label>
          One grid square on Y axis equals
          <input value={yScale} inputMode="decimal" onChange={(e) => setYScale(e.target.value)} />
        </label>
      </fieldset>

      <div className="actions">
        <button ref={startBtnRef} onClick={active ? stopPlotting : startPlotting} aria-pressed={active}>
          {active ? "Stop plotting (Esc)" : "Start plotting"}
        </button>
        <button onClick={save}>Save graph</button>
        <button onClick={loadLatest}>Load latest</button>
      </div>

      {mode === "input" && (
        <form className="step-form" onSubmit={(e) => { e.preventDefault(); submitStep(); }}>
          <label>
            Step size (for example 0.5 or 0.001)
            <input
              ref={stepInputRef}
              value={stepInput}
              inputMode="decimal"
              onChange={(e) => setStepInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setMode("plot"); announce("Step entry cancelled."); }
              }}
            />
          </label>
          <button type="submit">Set step</button>
        </form>
      )}

      <section className="readout" aria-label="Current state">
        <p><strong>Plotting:</strong> {active ? mode : "off"}</p>
        <p><strong>Cursor:</strong> {xn} {fmt(pos.x)}, {yn} {fmt(pos.y)}</p>
        <p><strong>Step:</strong> {fmt(step)}</p>
        <p><strong>Points:</strong> {points.length}</p>
      </section>

      <p role="status" aria-live="polite" className="status">{status}</p>

      {/* role="application" tells screen readers to pass arrow keys to the page instead of moving their reading cursor */}
      <div
        ref={areaRef}
        className={`plot-area${active ? " on" : ""}`}
        tabIndex={active ? 0 : -1}
        role={active ? "application" : undefined}
        aria-label={active ? "Graph plotting area. Press H for key help." : undefined}
        onKeyDown={active ? onKey : undefined}
      >
        <svg
          className="plane"
          viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
          role="img"
          aria-label={`Graph of ${yn} against ${xn} with ${points.length} plotted points. Cursor at ${say(pos)}.`}
        >
          <g transform="scale(1,-1)">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={t} y1={-extent} x2={t} y2={extent} className="grid" vectorEffect="non-scaling-stroke" />
                <line x1={-extent} y1={t} x2={extent} y2={t} className="grid" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            <line x1={-extent} y1={0} x2={extent} y2={0} className="axis" vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={-extent} x2={0} y2={extent} className="axis" vectorEffect="non-scaling-stroke" />
            {gpts.length > 1 && (
              <polyline
                className="curve" fill="none" vectorEffect="non-scaling-stroke"
                points={gpts.map((p) => `${p.x},${p.y}`).join(" ")}
              />
            )}
            {gpts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={r} className="dot" />)}
            {activePoint && <circle cx={activePoint.x} cy={activePoint.y} r={r * 2} className="review" />}
            <circle cx={gpos.x} cy={gpos.y} r={r * 1.5} className="cursor" />
          </g>
          <text className="axis-label" style={{ fontSize: fs }} x={extent - fs * 0.3} y={-fs * 0.5} textAnchor="end">{xn}</text>
          <text className="axis-label" style={{ fontSize: fs }} x={fs * 0.5} y={-extent + fs * 1.2}>{yn}</text>
        </svg>
        <p className="caption">
          1 grid square = {fmt(xs)} on {xn}, {fmt(ys)} on {yn}
        </p>
      </div>
    </main>
  );
}
