import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const Spread = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        d3.json('https://raw.githubusercontent.com/CynicDog/commits-spread/main/commit_history.json')
            .then(data => {

                const recentData = data.slice(data.length - 70, data.length);

                setData(recentData);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error loading the data:', error);
                setLoading(false);
            });
    }, []);

    const matrixRef = useRef();
    const infoRef = useRef();

    useEffect(() => {
        if (data) {
            renderMatrix();
        }
    }, [data]);

    const renderMatrix = () => {
        const topics = Object.keys(data.reduce((acc, d) => {
            Object.keys(d.commits_by_topics).forEach(topic => {
                acc[topic] = true;
            });
            return acc;
        }, {}));
        const colorScale = d3.scaleOrdinal()
            .domain(topics)
            .range(d3.schemeSet3);

        const numRows = 7;
        const numCols = Math.ceil(data.length / numRows);

        const squareSize = 12;
        const padding = 2;
        const width = numCols * (squareSize + padding);
        const height = numRows * (squareSize + padding);

        const svg = d3.select(matrixRef.current)
            .attr("width", width)
            .attr("height", height);

        const totalCommits = data.reduce((acc, d) => acc + d.total_count, 0);
        const maxDailyCommits = d3.max(data, d => d.total_count);

        // Define a linear scale for opacity
        const opacityScale = d3.scaleLinear()
            .domain([0, maxDailyCommits])
            .range([.4, 1]);

        const gridData = [];
        data.forEach((d, i) => {
            const row = i % numRows;
            const col = Math.floor(i / numRows);
            gridData.push({ row, col, commits_by_topics: d.commits_by_topics, total_count: d.total_count, date: d.date });
        });

        const infoContainer = d3.select(infoRef.current);
        if (gridData.length > 0) {
            const latestData = gridData[gridData.length - 1];
            const topic = Object.keys(latestData.commits_by_topics)[0];
            const date = latestData.date;

            infoContainer
                .selectAll("*").remove();
            infoContainer
                .append("p")
                .text(`${topic} (${date})`)
                .style("color", "white")
                .style("font-weight", "lighter");
        }

        const squares = svg.selectAll(".grid-square")
            .data(gridData)
            .enter()
            .append("rect")
            .attr("class", "grid-square")
            .attr("x", d => d.col * (squareSize + padding))
            .attr("y", d => d.row * (squareSize + padding))
            .attr("width", squareSize)
            .attr("height", squareSize)
            .attr("fill", d => {
                const topic = Object.keys(d.commits_by_topics)[0];
                return colorScale(topic);
            })
            .attr("fill-opacity", d => opacityScale(d.total_count));

        const handleMouseOver = (event, d) => {
            const topic = Object.keys(d.commits_by_topics)[0];
            const date = d.date;

            infoContainer
                .selectAll("*").remove();
            infoContainer
                .append("p")
                .text(`${topic} (${date})`)
                .style("color", "white")
                .style("font-weight", "lighter");

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("width", squareSize * 1.75)
                .attr("height", squareSize * 1.75)
                .attr("x", d.col * (squareSize + padding) - (squareSize * 1.75 - squareSize) / 2)
                .attr("y", d.row * (squareSize + padding) - (squareSize * 1.75 - squareSize) / 2)
                .attr("fill-opacity", 1);
        };

        const handleMouseOut = (event, d) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("width", squareSize)
                .attr("height", squareSize)
                .attr("x", d.col * (squareSize + padding))
                .attr("y", d.row * (squareSize + padding))
                .attr("fill-opacity", d => opacityScale(d.total_count));
        };

        squares.on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);
    };

    return (
        <div className="container p-3">
            {!loading ? (
                <>
                    <svg ref={matrixRef}></svg>
                    <div className="info-container" ref={infoRef}></div>
                </>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
};

export default Spread;
