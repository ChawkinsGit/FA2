import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import * as ss from "simple-statistics";
import regression from "regression";

function Graph({ data }) {
  if (!data || data.length < 2) {
    return <p className="text-center">Please enter at least 2 rows of data.</p>;
  }

  const [zoom, setZoom] = useState(1); // zoom level

  const sorted = [...data].sort((a, b) => a.year - b.year);
  const years = sorted.map((d) => d.year);
  const yearMean = ss.mean(years);
  const regressionInput = sorted.map((d) => [d.year - yearMean, d.revenue]);

  // Linear Regression
  const lr = ss.linearRegression(regressionInput);
  const linearFn = ss.linearRegressionLine(lr);

  // Polynomial Regression (degree 2)
  let polyResult = null;
  try {
    polyResult = regression.polynomial(regressionInput, { order: 2 });
  } catch (err) {
    console.warn("Polynomial fit failed:", err);
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const steps = 20;

  // Generate regression data
  const linearData = [];
  const polynomialData = [];

  for (let i = 0; i <= steps; i++) {
    const year = minYear + ((maxYear - minYear) * i) / steps;
    const centeredYear = year - yearMean;

    linearData.push({
      year,
      revenue: linearFn(centeredYear),
    });

    if (polyResult) {
      polynomialData.push({
        year,
        revenue: polyResult.predict(centeredYear)[1],
      });
    }
  }

  // --- ZOOM LOGIC ---
  const range = maxYear - minYear;
  const zoomedMin = minYear + (range * (1 - 1 / zoom)) / 2;
  const zoomedMax = maxYear - (range * (1 - 1 / zoom)) / 2;

  return (
    <div className="text-center">
      <LineChart
        key={zoom} // <— forces rerender when zoom changes
        width={600}
        height={400}
        data={sorted} // <— ensures XAxis responds to new domain
      >
        <CartesianGrid stroke="#ccc" />
        <XAxis
          dataKey="year"
          type="number"
          domain={[zoomedMin, zoomedMax]}
          tickFormatter={(v) => v.toFixed(0)}
          label={{ value: "Year", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          dataKey="revenue"
          type="number"
          domain={["auto", "auto"]}
          tickFormatter={(v) => v.toFixed(0)}
          label={{
            value: "Revenue (Millions)",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Legend />

        {/* Actual Data */}
        <Line
          data={sorted}
          dataKey="revenue"
          name="Actual Data"
          type="monotone"
          stroke="black"
          strokeWidth={4}
          dot={{ r: 4 }}
        />

        {/* Linear Regression */}
        <Line
          data={linearData}
          dataKey="revenue"
          name="Linear Fit"
          type="linear"
          stroke="blue"
          strokeWidth={2}
          dot={false}
        />

        {/* Polynomial Regression */}
        {polyResult && (
          <Line
            data={polynomialData}
            dataKey="revenue"
            name="Polynomial Fit"
            type="monotone"
            stroke="red"
            strokeWidth={2}
            dot={false}
          />
        )}
      </LineChart>

      {/* ZOOM SLIDER */}
      <div className="mt-3">
        <label className="me-2 fw-bold">Zoom:</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ width: "200px" }}
        />
        <span className="ms-2">{zoom.toFixed(1)}x</span>
      </div>
    </div>
  );
}


export default Graph