import { useEffect, useRef, useState } from "react";
import ReactDOMServer from 'react-dom/server';
import * as d3 from "d3";
import Java from "../assets/Java.jsx";
import Spring from "../assets/Spring.jsx";
import Python from "../assets/Python.jsx";
import Hibernate from "../assets/Hibernate.jsx";
import Vertx from "../assets/Vertx.jsx";
import Docker from "../assets/Docker.jsx";
import Dotnet from "../assets/Dotnet.jsx";
import Csharp from "../assets/Csharp.jsx";
import Kubernetes from "../assets/Kubernetes.jsx";
import Quarkus from "../assets/Quarkus.jsx";
import React from "../assets/React.jsx";
import GitHubActions from "../assets/GitHubActions.jsx";
import D3 from "../assets/D3.jsx";
import Azure from "../assets/Azure.jsx";
import {useTopic} from "../../Context.jsx";
import NodeJs from "../assets/NodeJs.jsx";

const topicToSvgMap = {
    "java": Java,
    "spring": Spring,
    "python": Python,
    "jpa": Hibernate,
    "vertx": Vertx,
    "docker": Docker,
    "dotnet": Dotnet,
    "csharp": Csharp,
    "kubernetes": Kubernetes,
    "minikube": Kubernetes,
    "quarkus": Quarkus,
    "react": React,
    "githubactions": GitHubActions,
    "d3": D3,
    "azure": Azure,
    "nodejs": NodeJs
};

const Network = () => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const { topic, setTopic } = useTopic();
    const networkRef = useRef();

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

    useEffect(() => {
        if (data) {
            renderNetwork();
        }
    }, [data]);

    const renderNetwork = () => {
        const topicCommits = data.reduce((acc, entry) => {
            Object.entries(entry.commits_by_topics).forEach(([topic, count]) => {
                if (!acc[topic]) {
                    acc[topic] = 0;
                }
                acc[topic] += count;
            });
            return acc;
        }, {});

        const topics = Object.keys(topicCommits);
        const commitCounts = Object.values(topicCommits);

        const width = 420;
        const height = 300;

        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(commitCounts)])
            .range([2, 40]);

        const colorScale = d3.scaleOrdinal()
            .domain(topics)
            .range(d3.schemeSet3);

        const nodes = topics.map(topic => ({
            id: topic,
            radius: radiusScale(topicCommits[topic]),
            color: colorScale(topic),
            opacity: .03
        }));

        const svg = d3.select(networkRef.current)
            .attr("width", width)
            .attr("height", height);

        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody()
                .strength(40)
                .distanceMin(40)
            )
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide()
                .radius(d => d.radius + 13)
                .strength(0.3)
            )
            .on("tick", ticked);

        const drag = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;

            event.subject.color = d3.color(event.subject.color).brighter(1);
            event.subject.opacity =  event.subject.opacity * 3;

            svg.selectAll('circle')
                .style('stroke', '#f3f3f3')
                .style('fill-opacity', d => d.opacity);
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;

            event.subject.color = d3.color(event.subject.color).darker(1);
            event.subject.opacity =  event.subject.opacity / 3;

            svg.selectAll('circle')
                .style('stroke', '#d3d3d3')
                .style('fill-opacity', d => d.opacity);
        }

        function ticked() {
            const circles = svg.selectAll('circle')
                .data(nodes);

            circles.enter()
                .append('circle')
                .attr('r', d => d.radius + 10)
                .style('fill', '#d3d3d3')
                .style('fill-opacity', d => d.opacity)
                .style('stroke', '#d3d3d3')
                .style('stroke-width', '.3px')
                .merge(circles)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            circles.exit().remove();

            const u = svg.selectAll('foreignObject')
                .data(nodes);

            u.enter()
                .append('foreignObject')
                .attr('width', d => d.radius * 2)
                .attr('height', d => d.radius * 2)
                .append('xhtml:div')
                .style('width', d => d.radius * 2 + 'px')
                .style('height', d => d.radius * 2 + 'px')
                .html(d => {
                    const SvgComponent = topicToSvgMap[d.id.toLowerCase()];
                    return SvgComponent ? ReactDOMServer.renderToString(SvgComponent(d.radius * 2)) : '';
                })
                .on('mouseenter', function(){
                    d3.select(this).style('cursor', 'grab');
                })
                .on('click', function(event, d) {
                    setTopic(d.id)
                })
                .call(drag)
                .merge(u)
                .attr('x', d => d.x - d.radius)
                .attr('y', d => d.y - d.radius);

            u.exit().remove();

            // set interaction boundary
            nodes.forEach(d => {
                const circleRadius = d.radius + 10;
                d.x = Math.max(circleRadius, Math.min(width - circleRadius, d.x));
                d.y = Math.max(circleRadius, Math.min(height - circleRadius, d.y));
            });

            svg.selectAll('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            svg.selectAll('foreignObject')
                .attr('x', d => d.x - d.radius)
                .attr('y', d => d.y - d.radius);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!loading ? (
                <>
                    <svg ref={networkRef}></svg>
                </>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
};

export default Network;
