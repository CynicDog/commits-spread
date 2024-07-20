import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import './App.css';
import Spread from "./components/Spread.jsx";

function App() {

    return (
       <Router>
           <Routes>
               <Route path="/spread" component={Spread} />
               <Route path="/" component={Spread} />
           </Routes>
           <Spread />
       </Router>
    );
}

export default App;
