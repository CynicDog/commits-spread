import {createContext, useContext, useState} from "react";

const TopicContext = createContext();

export const TopicProvider = ({ children }) => {
    const [topic, setTopic] = useState('');

    return (
        <TopicContext.Provider value={{ topic, setTopic }}>
            {children}
        </TopicContext.Provider>
    );
}
export const useTopic = () => useContext(TopicContext);