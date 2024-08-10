import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Spread from "./components/Spread.jsx";
import Network from "./components/Network.jsx";
import Export from "./components/Export.jsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Spread />} />
                <Route path="/spread" element={<Spread />} />
                <Route path="/network" element={<Network />} />
                <Route path="/export" element={<Export />} />
            </Routes>
        </Router>
    );
}

export default App;
