'use strict';

import d3 from 'd3';

import defaultValue from 'terriajs-cesium/Source/Core/defaultValue';
import defined from 'terriajs-cesium/Source/Core/defined';

const defaultMargin = {
    top: 20,
    right: 30,
    bottom: 20,
    left: 50
};
const miniYAxisShift = 30;

const defaultTransitionDuration = 1000; // milliseconds
const xAxisHeight = 30;
const xAxisLabelHeight = 15;

const LineChart = {

    /**
     * Create a Line Chart.
     * @param  {DOMElement} element The DOM element in which to place the chart.
     * @param  {Object} state The state of the chart.
     * @param  {Number} state.width The width of the svg element.
     * @param  {Number} state.height The height of the svg element.
     * @param  {Object} [state.margin] The chart's margin.
     * @param  {Number} state.margin.top The chart's top margin.
     * @param  {Number} state.margin.right The chart's right margin.
     * @param  {Number} state.margin.bottom The chart's bottom margin.
     * @param  {Number} state.margin.left The chart's left margin.
     * @param  {Object} [state.domain] The x and y ranges to show.
     * @param  {Number[]} state.domain.x [x-minimum, x-maximum].
     * @param  {Number[]} state.domain.y [y-minimum, y-maximum].
     * @param  {Array[]} state.data The array of arrays of data. Each subarray contains elements {x: X, y: Y}. Further, each subarray must have a unique id property.
     * @param  {String[]} [state.colors] An array of css color strings, of the same length as data.
     * @param  {Object} [state.axisLabel] Labels for the x and y axes.
     * @param  {String} [state.axisLabel.x] Label for the x axis.
     * @param  {String} [state.axisLabel.y] Label for the y axis.
     * @param  {Boolean} [state.mini] If true, show minified axes.
     * @param  {Number} [state.transitionDuration] Duration of transition effects, in milliseconds.
     */
    create(element, state) {
        const svg = d3.select(element).append('svg')
            .attr('class', 'd3')
            .attr('width', state.width)
            .attr('height', state.height);

        const lineChart = svg.append('g')
            .attr('class', 'line-chart');

        lineChart.append('g')
            .attr('class', 'x axis')
            .style('opacity', 1e-6)
            .append('text')
            .attr('class', 'label');
        lineChart.append('g')
            .attr('class', 'y axis')
            .style('opacity', 1e-6);
        lineChart.append('g')
            .attr('class', 'no-data')
            .append('text');

        this.update(element, state);
    },

    update(element, state) {
        render(element, state);
    },

    destroy(element) {
        // Clean up.
    }

};


function render(element, state) {
    const margin = defaultValue(state.margin, defaultMargin);
    const size = calculateSize(element, margin, state);
    const scales = calculateScales(size, state);
    const data = state.data;
    const colors = state.colors;
    const transitionDuration = defaultValue(state.transitionDuration, defaultTransitionDuration);

    d3.select(element).select('svg')
        .attr('width', state.width)
        .attr('height', state.height);

    const g = d3.select(element).selectAll('.line-chart');
    g.attr('transform', 'translate(' + margin.left + ',' + margin.right + ')');

    const lines = g.selectAll('.line').data(data, d=>d.id).attr('class', 'line');
    const isFirstLine = (!defined(lines[0][0]));
    const path = d3.svg.line()
        .x((d)=>scales.x(d.x))
        .y((d)=>scales.y(d.y))
        .interpolate('basic');

    // Enter.
    lines.enter().append('path')
        .attr('class', 'line')
        .attr('d', path)
        .style('fill', 'none')
        .style('opacity', 1e-6)
        .style('stroke', (d, i)=>defined(colors) ? colors[i] : '')
        .style('stroke-width', 2);

    // Enter and update.
    lines.transition().duration(transitionDuration)
        .attr('d', path)
        .style('opacity', 1)
        .style('stroke', (d, i)=>defined(colors) ? colors[i] : '');

    // Exit.
    lines.exit().remove();

    // Axes.
    const xAxis = d3.svg.axis().scale(scales.x).orient('bottom');
    let y0 = Math.min(Math.max(scales.y(0), 0), size.plotHeight);
    // Mini charts have the x-axis label at the bottom, regardless of where the x-axis would actually be.
    if (state.mini) {
        y0 = size.plotHeight;
    }
    // If this is the first line, start the x-axis in the right place straight away.
    if (isFirstLine) {
        g.select('.x.axis').attr('transform', 'translate(0,' + y0 + ')');
    }
    g.select('.x.axis')
        .transition().duration(transitionDuration)
        .attr('transform', 'translate(0,' + y0 + ')')
        .style('opacity', 1)
        .call(xAxis);
    // If mini, hide the ticks, but not the axis, so the x-axis label can still be shown.
    g.select('.x.axis')
        .selectAll('.tick')
        .transition().duration(transitionDuration)
        .style('opacity', state.mini ? 1e-6 : 1);

    if (defined(state.axisLabel) && defined(state.axisLabel.x)) {
        g.select('.x.axis .label')
            .attr('transform', 'translate(' + (size.width / 2) + ', ' + xAxisLabelHeight + ')')
            .attr('text-anchor', 'middle')
            .text(state.axisLabel.x);
    }

    const yAxis = d3.svg.axis().scale(scales.y).ticks(8).orient('left');
    if (state.mini) {
        yAxis.ticks(2)
            .tickSize(0, 0)
            .orient('right');
    }
    g.select('.y.axis')
        .attr('transform', 'translate(' + (state.mini ? -miniYAxisShift : 0) + ', 0)')
        .transition().duration(transitionDuration)
        .style('opacity', 1)
        .call(yAxis);

    // No data. Show message if no data to show.
    var noData = g.select('.no-data')
        .style('opacity', (data.length > 0 && data[0].length > 0) ? 1e-6 : 1);

    noData.select('text')
        .text('No preview available')
        .style('text-anchor', 'middle')
        .attr('x', element.offsetWidth / 2 - margin.left)
        .attr('y', (size.height - 24) / 2);
}

function calculateSize(element, margin, state) {
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;
    const plotHeight = height
        - (state.mini ? 0 : xAxisHeight)
        - ((defined(state.axisLabel) && defined(state.axisLabel.x)) ? xAxisLabelHeight : 0);
    return {
        width: width,
        height: height,
        plotHeight: plotHeight
    };
}

function calculateScales(size, state) {
    const data = state.data;
    let domain = state.domain;
    // data is only used if domain is undefined, to choose the min-max.
    if (!defined(domain)) {
        if (!defined(data)) {
            return;
        }
        domain = {
            x: [d3.min(data, a=>d3.min(a, d=>d.x)), d3.max(data, a=>d3.max(a, d=>d.x))],
            y: [d3.min(data, a=>d3.min(a, d=>d.y)), d3.max(data, a=>d3.max(a, d=>d.y))],
        };
        // If the y-domain is positive and could reasonably be displayed to include zero, expand it to do so.
        // (Eg. the range is 5 to 50, do it; if it is 5 to 8, do not. Set the boundary arbitrarily at 5 to 12.5, ie. 1:2.5.)
        if ((domain.y[0] > 0) && (domain.y[0] / domain.y[1] < 0.4)) {
            domain.y[0] = 0;
        }
        // If the y-domain is negative and could reasonably be displayed to include zero, expand it to do so.
        if ((domain.y[1] < 0) && (domain.y[0] / domain.y[1] < 0.4)) {
            domain.y[1] = 0;
        }
    }

    let x;
    if (domain.x[0] instanceof Date) {
        x = d3.time.scale();
    } else {
        x = d3.scale.linear();
    }

    x.range([0, size.width]).domain(domain.x);

    // The x-axis takes up plot space, if it is at the bottom of the plot (ie. if the y-domain is entirely positive or entirely negative),
    // but not if it is in the middle of the plot (ie. if the y-domain includes zero).

    const yContainsZero = (domain.y[0] < 0 && domain.y[1] > 0);

    if (yContainsZero) {
        const yPositiveOnly = d3.scale.linear()
            .range([size.plotHeight, 0])
            .domain([0, domain.y[1]]);
        if (yPositiveOnly(domain.y[0]) < size.height) {
            // There's only a very small negative range. The y-axis is near the bottom of the panel.
            // The x-axis can be xAxisHeight from the bottom, and the negative part of the y-axis fits in the xAxisHeight.
            // We want to use this scale, but we need to expand its range and domain. To do this, just use plotHeight = yPositiveOnly(domain.y[0]).
            size.plotHeight = yPositiveOnly(domain.y[0]);
        } else {
            // There's a big negative range, so the y-axis is not near the bottom of the panel.
            size.plotHeight = size.height;
        }
    }

    const y = d3.scale.linear()
        .range([size.plotHeight, 0])
        .domain(domain.y);

    return {x: x, y: y};
}


module.exports = LineChart;