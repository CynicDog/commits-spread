import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Spread from "./components/Spread.jsx";
import Network from "./components/Network.jsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/commits-spread" element={<Spread />} />
                <Route path="/commits-spread/spread" element={<Spread />} />
                <Route path="/commits-spread/network" element={<Network />} />
            </Routes>
        </Router>
    );
}

export default App;
