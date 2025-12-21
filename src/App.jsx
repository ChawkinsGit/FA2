import { useState } from 'react'
import Graph from './components/graph'
import Table from './components/Table';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'


function App() {
  const [data, setData] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [lastGraphedSnapshot, setLastGraphedSnapshot] = useState(null);
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [isNaming, setIsNaming] = useState(false);
  const [graphName, setGraphName] = useState("");
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryIndex, setEditingEntryIndex] = useState(null);

  // dropdown for saved entries
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // helper: deep clone plain array-of-objects
  const cloneData = (arr) => (arr ? arr.map((r) => ({ ...r })) : []);

  // Reset: clear visible data & graph, but keep lastGraphedSnapshot (so Restore still works)
  const handleReset = () => {
    if ((data && data.length > 0) || (graphData && graphData.length > 0)) {
      setData([]);
      setGraphData([]);
      // NOTE: do NOT clear lastGraphedSnapshot
    }
  };

  // Restore: always restore from lastGraphedSnapshot (independent of current state)
  const handleRestore = () => {
    if (lastGraphedSnapshot && lastGraphedSnapshot.length > 0) {
      const cloned = cloneData(lastGraphedSnapshot);
      setData(cloned);
      setGraphData(cloned);
    }
  };

  // Save Graph button click -> show name input
  const handleSaveGraphClick = () => {
    if (!data || data.length === 0) return;
    setIsNaming((prev) => !prev);

    if(isNaming) {
      setGraphName('')
    }

  };

  // Confirm Save: saves a clone of current table data under provided name
  const handleConfirmSave = () => {
    if (!graphName.trim() || !data || data.length === 0) return;

    if(savedGraphs.some((g) => g.name.toLowerCase() === graphName.trim().toLowerCase())) {
      alert(`A saved graph has already been named "${graphName.trim()}." Please choose a different name.`)
      return 
    }

    const newEntry = {
      id: Date.now(),
      name: graphName.trim(),
      tableData: cloneData(data),
    };
    setSavedGraphs((prev) => [...prev, newEntry]);
    setGraphName("");
    setIsNaming(false);
  };

  // Toggle dropdown for entries
  const toggleDropdown = () => setIsDropdownOpen((s) => !s);

  // View: show the selected saved data on the graph (read-only)
  const handleView = (index) => {
    const entry = savedGraphs[index];
    if (!entry) return;
    const cloned = cloneData(entry.tableData);
    setGraphData(cloned);
    // leave table alone (view is read-only)
  };

  // Edit: load saved entry into table for editing (fresh clone)
  const handleEdit = (index) => {
    const entry = savedGraphs[index];
    if (!entry) return;

    const cloned = cloneData(entry.tableData);
    setData(cloned);
    setGraphData(cloned);
    setIsEditingEntry(true);
    setEditingEntryIndex(index);
    // also update lastGraphedSnapshot so restore will go back to this if needed
    setLastGraphedSnapshot(cloned);
    // open dropdown so the Save Edits button is visible (optional)
    setIsDropdownOpen(true);
  };

  
   const handleSaveEditedEntry = () => {
    if (editingEntryIndex === null || editingEntryIndex === undefined) return;
    if (!savedGraphs[editingEntryIndex]) return;

    // Update the savedGraphs copy with the new tableData
    const updated = [...savedGraphs];
    updated[editingEntryIndex] = {
      ...updated[editingEntryIndex],
      tableData: cloneData(data),
    };

    setSavedGraphs(updated);

    // Refresh table + graph to show saved results (cloned)
    setData(cloneData(updated[editingEntryIndex].tableData));
    setGraphData(cloneData(updated[editingEntryIndex].tableData));
    setData([]);   
    setGraphData(null); 
    // exit edit mode
    setIsEditingEntry(false);
    setEditingEntryIndex(null);
  };

  // Delete saved entry
  const handleDelete = (id) => {
    setSavedGraphs((prev) => prev.filter((e) => e.id !== id));
    // if we deleted the currently editing entry, exit edit-mode
    if (isEditingEntry && editingEntryIndex !== null) {
      const maybeDeleted = savedGraphs[editingEntryIndex];
      if (maybeDeleted && maybeDeleted.id === id) {
        setIsEditingEntry(false);
        setEditingEntryIndex(null);
      }
    }
  };


  return (
    <div>
      {/* HEADER */}
      <header
        className="bg-success text-white text-center p-3 rounded mx-auto"
        style={{
          width: "70%" 
        }}
      >
        <h1>Trend Simulator</h1>
      </header>

      {/* MAIN LAYOUT */}
      <div className="container-fluid" style={{ marginTop: "120px" }}>
        <div className="row">
          <div className="col-md-6">
            {/* Table expects data, setData, setGraphData, setLastGraphedSnapshot */}
            <Table
              data={data}
              setData={setData}
              setGraphData={setGraphData}
              setLastGraphedSnapshot={setLastGraphedSnapshot}
            />
          </div>

          <div className="col-md-6">
            <Graph data={graphData} />
          </div>
        </div>
      </div>

      {/* FOOTER BUTTONS */}
        <div className="mb-3"
          style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
          padding: "1rem",
          width: "45vw",
          minWidth: "280px",
          maxWidth: "400px",
          boxSizing: "border-box",
        }}>
          <button className="btn btn-primary btn-lg" onClick={handleReset}>
            Reset Data
          </button>
          <button className="btn btn-secondary btn-lg" onClick={handleRestore}>
            Restore Data
          </button>
          

          {/* If currently editing, show Save Edits here as well (optional UX) */}
          {isEditingEntry && (
            <button
              className="btn btn-warning btn-lg"
              onClick={handleSaveEditedEntry}
            >
              Save Edits
            </button>
            
          )}

          <button className="btn btn-success btn-lg" onClick={handleSaveGraphClick}>
            {isNaming ? "Cancel Save" : "Save Graph"}
          </button>
          <button className="btn btn-danger btn-lg" onClick={toggleDropdown}>
            {isDropdownOpen ? "Hide Entries" : "View Entries"}
          </button>
        </div>

        {/* Save Graph Section */}
        
          

          {isNaming && (
            <div className="d-flex mb-3 w-100">
              <input
                type="text"
                className="form-control me-2"
                placeholder="Enter graph name"
                value={graphName}
                onChange={(e) => setGraphName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleConfirmSave}>
                Save
              </button>
            </div>
          )}

          {/* View Entries Button */}
          

          {/* DROPDOWN LIST */}
          {isDropdownOpen && savedGraphs.length > 0 && (
            <div className="border rounded mt-3 p-2 bg-light w-100">
              {savedGraphs.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="d-flex align-items-center justify-content-between mb-2"
                >
                  <span className="fw-bold">{entry.name}</span>
                  <div>
                    <button
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={() => handleView(idx)}
                    >
                      View
                    </button>

                    <button
                      className="btn btn-outline-secondary btn-sm me-2"
                      onClick={() => handleEdit(idx)}
                    >
                      Edit
                    </button>


                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isDropdownOpen && savedGraphs.length === 0 && (
            <div className="mt-3 text-muted">No saved entries yet.</div>
          )}

    </div>

  );
}
export default App
