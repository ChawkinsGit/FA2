import React from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';


const Table = ({ data, setData, setGraphData, setLastGraphedSnapshot }) => {
 const handleChange = (index, field, value) => {
    const newData = data.map((r) => ({ ...r })); // clone array + objects
    // allow empty string to clear
    newData[index][field] = value === "" ? "" : Number(value);
    setData(newData);
  };

  const addRow = () => {
    const newData = [...data.map((r) => ({ ...r })), { year: "", revenue: "" }];
    setData(newData);
  };

  const removeRow = (index) => {
    const newData = data.map((r) => ({ ...r }));
    newData.splice(index, 1);
    setData(newData);
  };

  const handleGraphData = () => {
    // validate and keep only rows with numeric year & revenue
    const cleanData = data
      .filter(
        (row) =>
          row.year !== "" &&
          row.revenue !== "" &&
          !isNaN(row.year) &&
          !isNaN(row.revenue)
      )
      .map((r) => ({ year: Number(r.year), revenue: Number(r.revenue) })); // cloned sanitized objects

    // deep clone to ensure independence
    const cloned = JSON.parse(JSON.stringify(cleanData));

    // set graphData (visible plot)
    if (setGraphData) setGraphData(cloned);

    // save snapshot for restore (does NOT get cleared by Reset)
    if (setLastGraphedSnapshot) setLastGraphedSnapshot(cloned);
  };
  return (
    <div className="container-fluid" style={{ marginTop: "120px" }}>
      <div style={{ width: "60%", position: "relative" }}>
        <table
          className="table table-bordered fs-4"
          style={{ transform: "scale(.8)", transformOrigin: "top left" }}
        >
          <thead className="table-dark">
            <tr>
              <th className="text-center p-3">Year</th>
              <th className="text-center p-3">Revenue(in mils)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td style={{ width: "150px" }}>
                  <input
                    type="number"
                      min="2000"
                      max="2035"
                    value={row.year}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        // Only allow within range
                        if (value >= 1980 && value <= 2035) {
                          handleChange(i, "year", value);
                        } else if (e.target.value === "") {
                          handleChange(i, "year", "");
                        }
                      }}
                    className="form-control"
                    style={{ fontSize: "1rem", width: "100%", textAlign: "center" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.revenue}
                    onChange={(e) =>
                      handleChange(i, "revenue", e.target.value)
                    }
                    className="form-control"
                  />
                </td>
                <td className="text-center">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeRow(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Row + Graph Data buttons */}
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-success p-1 m-0" onClick={addRow}>
            Add Row
          </button>
          <button className="btn btn-primary p-1 m-0" onClick={handleGraphData}>
            Graph Data
          </button>
        </div>
      </div>
    </div>
  );
};


export default Table