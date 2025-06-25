// Helper function to calculate brightness of a hex color
function getBrightness(hexColor) {
    const r = parseInt(hexColor.substr(1,2), 16);
    const g = parseInt(hexColor.substr(3,2), 16);
    const b = parseInt(hexColor.substr(5,2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

function renderXPProgressChart(data) {
    const margin = {top: 20, right: 30, bottom: 30, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select("#xpChart").html("");

    const svg = d3.select("#xpChart")
        .append("svg")
        .attr("role", "img")
        .attr("aria-label", "Line chart showing total XP progress over time")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("title").text("XP progress line chart over dates");

    // Add X axis
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    // Add Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total)])
        .range([height, 0]);

    // Add the line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.total));

    // Add the path with animation
    const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4CAF50")
        .attr("stroke-width", 2)
        .attr("d", line);

    const length = path.node().getTotalLength();

    path.attr("stroke-dasharray", length + " " + length)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    // Tooltip (created once and reused)
    let tooltip = d3.select("#xpChart").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("#xpChart")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background-color", "rgba(0,0,0,0.75)")
            .style("color", "#fff")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("transition", "opacity 0.3s ease")
            .style("z-index", 1000);
    }

    // Add dots with tooltip events
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", 5)
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.total))
        .attr("fill", "#4CAF50")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            tooltip.style("opacity", 1)
                .html(`Date: ${d.date.toLocaleDateString()}<br>Total XP: ${d.total.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            const containerRect = document.getElementById('xpChart').getBoundingClientRect();
            const left = event.clientX - containerRect.left + 10;
            const top = event.clientY - containerRect.top - 28;
            tooltip.style("left", `${left}px`)
                   .style("top", `${top}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
            tooltip.style("opacity", 0);
        });
}

function renderProjectStats(data) {
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    d3.select("#skillsChart").html("");
    d3.select("#skillsChart").select(".legend").remove(); // Remove previous legend if exists

    const svg = d3.select("#skillsChart")
        .append("svg")
        .attr("role", "img")
        .attr("aria-label", "Pie chart showing pass and fail project stats")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    svg.append("title").text("Project statistics pie chart showing pass and fail distribution");

    const color = d3.scaleOrdinal()
        .domain(["Pass", "Fail"])
        .range(["#4CAF50", "#f44336"]);

    const pie = d3.pie()
        .value(d => d.value);

    const data_ready = pie([
        {name: "Pass", value: data.pass},
        {name: "Fail", value: data.fail}
    ]);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.8);

    // Add animation on pie slices
    svg.selectAll('path')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.name))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)
        .transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const i = d3.interpolate(d.startAngle, d.endAngle);
            return function(t) {
                d.endAngle = i(t);
                return arc(d);
            };
        });

    // Add labels with dynamic contrast color
    svg.selectAll('text')
        .data(data_ready)
        .enter()
        .append('text')
        .text(d => `${d.data.name}: ${d.data.value}`)
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .style("text-anchor", "middle")
        .style("font-size", 12)
        .style("fill", d => {
            const bgColor = color(d.data.name);
            return getBrightness(bgColor) < 140 ? "#fff" : "#000";
        });

    // Add legend below the pie chart
    const legend = d3.select("#skillsChart")
        .append("div")
        .attr("class", "legend")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("margin-top", "10px");

    ["Pass", "Fail"].forEach(name => {
        const item = legend.append("div")
            .style("margin-right", "15px")
            .style("display", "flex")
            .style("align-items", "center");
        item.append("div")
            .style("width", "20px")
            .style("height", "20px")
            .style("background-color", color(name))
            .style("margin-right", "5px");
        item.append("span").text(name);
    });
}
