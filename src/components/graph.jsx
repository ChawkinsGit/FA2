import React, { useState, useMemo } from "react";
import {
 LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import * as ss from "simple-statistics";
import regression from "regression";

function Graph({ data }) {
   if (!data || data.length < 2) {
    return <p className="text-center">Please enter at least 2 rows of data.</p>;
  }

  // Sort & canonicalize input
  const sorted = useMemo(() => {
    return [...data]
      .map((d) => ({ year: Number(d.year), revenue: Number(d.revenue) }))
      .sort((a, b) => a.year - b.year);
  }, [data]);

  const years = sorted.map((d) => d.year);
  const fullMinYear = Math.min(...years);
  const fullMaxYear = Math.max(...years);

  // Regression prep: center years for numerical stability
  const yearMean = ss.mean(years);
  const regressionInput = sorted.map((d) => [d.year - yearMean, d.revenue]);

  // Compute linear regression
  const lr = ss.linearRegression(regressionInput);
  const linearFn = ss.linearRegressionLine(lr);

  // Polynomial regression (degree 2) with safety
  let polyResult = null;
  try {
    polyResult = regression.polynomial(regressionInput, { order: 2 });
  } catch (err) {
    polyResult = null;
    // console.warn("polynomial fit failed:", err);
  }

  // Zoom state
  const [zoomDomain, setZoomDomain] = useState(null); // [minYear, maxYear] or null
  const [selectedPoints, setSelectedPoints] = useState([]); // store up to two payloads {year, revenue}

  // Helper: produce sampled regression data for given x-domain
  const makeRegressionSamples = (minYear, maxYear, steps = 80) => {
    const linearData = [];
    const polyData = [];
    for (let i = 0; i <= steps; i++) {
      const year = minYear + ((maxYear - minYear) * i) / steps;
      const centered = year - yearMean;
      linearData.push({ year, revenue: linearFn(centered) });
      if (polyResult) polyData.push({ year, revenue: polyResult.predict(centered)[1] });
    }
    return { linearData, polyData };
  };

  // Determine visible X domain (before inward shrink)
  const visibleMinYear = zoomDomain ? zoomDomain[0] : fullMinYear;
  const visibleMaxYear = zoomDomain ? zoomDomain[1] : fullMaxYear;

  // If zoomDomain set, regression samples are made inside that domain (we will use stored zoomDomain after shrink)
  const { linearData, polyData } = makeRegressionSamples(visibleMinYear, visibleMaxYear, 120);

  // Compute Y domain for current X domain by looking at actual points + regression points in range
  const computeYDomain = (xmin, xmax) => {
    const candidates = [];

    // actual points within [xmin, xmax]
    for (const p of sorted) {
      if (p.year >= xmin && p.year <= xmax) candidates.push(p.revenue);
    }
    // regression points
    for (const p of linearData) {
      if (p.year >= xmin && p.year <= xmax) candidates.push(p.revenue);
    }
    if (polyResult) {
      for (const p of polyData) {
        if (p.year >= xmin && p.year <= xmax) candidates.push(p.revenue);
      }
    }

    if (candidates.length === 0) {
      // fallback to whole-data domain (ensures some range)
      const allRevs = sorted.map((s) => s.revenue);
      const minY = Math.min(...allRevs, 0);
      const maxY = Math.max(...allRevs, 1);
      return [Math.floor(minY), Math.ceil(maxY)];
    }

    const minY = Math.min(...candidates);
    const maxY = Math.max(...candidates);
    const padding = (maxY - minY) * 0.08 || 1;
    const newMin = Math.max(0, Math.floor(minY - padding));
    const newMax = Math.ceil(maxY + padding);
    return [newMin, newMax];
  };

  // Determine current X domain to give to XAxis: if zoomDomain exists, use it, else full
  const currentXDomain = zoomDomain ? zoomDomain : [fullMinYear, fullMaxYear];

  // Compute current Y domain based on current X domain (auto-rescale)
  const currentYDomain = computeYDomain(currentXDomain[0], currentXDomain[1]);

  // Handle clicking an actual data point — only actual points use CustomDot and call this handler
  const handlePointClick = (payload) => {
    if (!payload) return;
    const clickedYear = Number(payload.year);

    // If no selection -> set first
    if (selectedPoints.length === 0) {
      setSelectedPoints([{ year: clickedYear, revenue: Number(payload.revenue) }]);
      return;
    }

    // If one already selected and user clicks same point -> clear selection
    if (selectedPoints.length === 1 && selectedPoints[0].year === clickedYear) {
      setSelectedPoints([]);
      return;
    }

    // If one selected, set second and perform zoom
    if (selectedPoints.length === 1) {
      const first = selectedPoints[0];
      const second = { year: clickedYear, revenue: Number(payload.revenue) };

      // ensure we have distinct years
      if (first.year === second.year) {
        setSelectedPoints([]); // nothing to zoom
        return;
      }

      // compute raw bounds
      const xmin = Math.min(first.year, second.year);
      const xmax = Math.max(first.year, second.year);

      // apply inward shrink 35% of range (per your request)
      const range = xmax - xmin;
      const shrinkAmount = range * 0.35;
      let newMin = xmin + shrinkAmount;
      let newMax = xmax - shrinkAmount;

      // if shrink collapses domain (very small), fall back to center +/- small window
      if (newMax <= newMin) {
        const mid = (xmin + xmax) / 2;
        const half = Math.max(1, range * 0.1);
        newMin = mid - half;
        newMax = mid + half;
      }

      // clamp to full data bounds
      if (newMin < fullMinYear) newMin = fullMinYear;
      if (newMax > fullMaxYear) newMax = fullMaxYear;

      setZoomDomain([newMin, newMax]);
      // clear selection (or you might want to keep it visible — here we clear)
      setSelectedPoints([]);
      return;
    }

    // If two selected already (shouldn't happen), reset to new first
    setSelectedPoints([{ year: clickedYear, revenue: Number(payload.revenue) }]);
  };

  // Reset zoom button
  const resetZoom = () => {
    setZoomDomain(null);
    setSelectedPoints([]);
  };

  // Custom dot component for "actual data" so only those points are clickable
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    // if cx/cy are NaN (outside domain), skip
    if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;

    // selected visual style
    const isSelected = selectedPoints.some((p) => p.year === Number(payload.year));

    return (
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 6 : 4}
        fill={isSelected ? "#ffc107" : "#000"}
        stroke="#fff"
        strokeWidth={1}
        style={{ cursor: "pointer" }}
        onClick={() => handlePointClick(payload)}
      />
    );
  };

  return (
    <div style={{ width: "100%", height: 450 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sorted} margin={{ top: 18, right: 24, left: 20, bottom: 20 }}>
          <CartesianGrid stroke="#eee" />

          <XAxis
            dataKey="year"
            type="number"
            domain={currentXDomain}
            tickFormatter={(v) => Math.round(v)}
            allowDecimals={false}
            tickCount={7}
          />

          <YAxis domain={currentYDomain} tickFormatter={(v) => Math.round(v)} />

          <Tooltip />

          <Legend />

          {/* Actual data; use custom dot so clicks register on real data points */}
          <Line
            data={sorted}
            dataKey="revenue"
            name="Actual Data"
            type="monotone"
            stroke="#000000"
            strokeWidth={3}
            dot={<CustomDot />}
            isAnimationActive={false}
          />

          {/* Linear fit sampled across currentXDomain */}
          {linearData && (
            <Line
              data={linearData}
              dataKey="revenue"
              name="Linear Fit"
              type="monotone"
              stroke="#0d6efd"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}

          {/* Polynomial fit */}
          {polyResult && (
            <Line
              data={polyData}
              dataKey="revenue"
              name="Polynomial Fit"
              type="monotone"
              stroke="#dc3545"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="d-flex justify-content-center mt-2 gap-2">
        {zoomDomain ? (
          <button className="btn btn-warning btn-sm" onClick={resetZoom}>
            Reset Zoom
          </button>
        ) : (
          <div className="text-muted">Click 2 actual points to zoom (35% inward)</div>
        )}
      </div>
    </div>
  );
}


export default Graph