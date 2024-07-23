import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const Network = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        d3.json('https://raw.githubusercontent.com/CynicDog/commits-spread/main/commit_history.json')
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error loading the data:', error);
                setLoading(false);
            });
    }, []);

    const networkRef = useRef();

    useEffect(() => {
        if (data) {
            renderNetwork();
        }
    }, [data]);

    const renderNetwork = () => {
        // Aggregate commits by topics
        const topicCommits = data.reduce((acc, entry) => {
            Object.entries(entry.commits_by_topics).forEach(([topic, count]) => {
                if (!acc[topic]) {
                    acc[topic] = 0;
                }
                acc[topic] += count;
            });
            return acc;
        }, {});

        console.log(topicCommits);

        const topics = Object.keys(topicCommits);
        const commitCounts = Object.values(topicCommits);

        // Set up SVG dimensions
        const width = 400;
        const height = 320;

        // Create a scale for node radius
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(commitCounts)])
            .range([3, 20]);

        // Create a color scale for nodes
        const colorScale = d3.scaleOrdinal()
            .domain(topics)
            .range(d3.schemeSet3);

        const nodes = topics.map(topic => ({
            id: topic,
            radius: radiusScale(topicCommits[topic]),
            color: colorScale(topic)
        }));

        const svg = d3.select(networkRef.current)
            .attr("width", width)
            .attr("height", height);

        // Create a simulation with forces
        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-5))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.radius + 1))
            .on("tick", ticked);

        function ticked() {
            const u = svg.selectAll('circle')
                .data(nodes);

            u.enter()
                .append('circle')
                .attr('r', d => d.radius)
                .merge(u)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('fill', d => d.color)
                .attr('stroke', 'black')
                .attr('stroke-width', 1);

            u.exit().remove();
        }
    };

    return (
        <div className="container p-3">
            {!loading ? (
                <svg ref={networkRef}></svg>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
};

export default Network;
