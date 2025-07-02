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


function renderProjectXPBars(transactions) {
    // Filter for piscine javascript projects only
    const filtered = transactions.filter(tx =>
        tx.object && tx.object.name && tx.object.name.includes("")
    );

    // Group by project name and sum XP
    const projectMap = {};
    filtered.forEach(tx => {
        const name = tx.object.name;
        if (!projectMap[name]) {
            projectMap[name] = { xp: 0, date: tx.createdAt };
        }
        projectMap[name].xp += tx.amount;
        // Use the latest date for the project
        if (new Date(tx.createdAt) > new Date(projectMap[name].date)) {
            projectMap[name].date = tx.createdAt;
        }
    });

    const data = Object.entries(projectMap).map(([name, info]) => ({
        name,
        xp: info.xp,
        date: info.date
    }));

    // Sort by XP or date if you want
    data.sort((a, b) => b.xp - a.xp);

    // SVG setup
    const margin = {top: 30, right: 30, bottom: 100, left: 60};
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select("#xpBars").html("");


    const svg = d3.select("#xpBars")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis (project names)
    const x = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([0, width])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Y axis (XP)
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.xp)])
        .range([height, 0]);

    svg.append("g").call(d3.axisLeft(y));

    // Tooltip
    const tooltip = d3.select("#xpBars")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "#222")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    // Bars
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.xp))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.xp))
        .attr("fill", "#4CAF50")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#388e3c");
            tooltip.style("opacity", 1)
                .html(
                    `<strong>${d.name}</strong><br>Date: ${new Date(d.date).toLocaleDateString()}<br>XP: ${d.xp.toLocaleString()}`
                );
        })
        .on("mousemove", function(event) {
            const container = document.getElementById("xpBars"); // or the relevant chart container
            const rect = container.getBoundingClientRect();
            // event.clientX/Y are relative to the viewport, so subtract the container's top/left
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            tooltip
                .style("left", (x + 0) + "px")
                .style("top", (y - 0) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#4CAF50");
            tooltip.style("opacity", 0);
        });
}
