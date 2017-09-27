// A delayed binder for keyup triggers
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js
(function($) {

    $.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {

        if ( $.isFunction( data ) ) {
            throttle = timeout;
            timeout = fn;
            fn = data;
            data = undefined;
        }

        // Allow delayed function to be removed with fn in unbind function
        fn.guid = fn.guid || ($.guid && $.guid++);

        // Bind each separately so that each element has its own delay
        return this.each(function() {

            var wait = null;

            function cb() {
                var e = $.extend(true, { }, arguments[0]);
                var ctx = this;
                var throttler = function() {
                    wait = null;
                    fn.apply(ctx, [e]);
                };

                if (!throttle) { clearTimeout(wait); wait = null; }
                if (!wait) { wait = setTimeout(throttler, timeout); }
            }

            cb.guid = fn.guid;

            $(this).bind(type, data, cb);
        });
    };

})(jQuery);


// Implement ability to exclude in search box
function excludeSearch() {
    var context = $(this).closest('div.log-viewer-wrapper');
    var name = context.data('name');
    var filter = $(this).val();
    console.log ('excludeSearch', name, filter);
    if (filter.length) neg_filter = '^((?!' + filter + ').)*$';

    logTables[name].dataTable
        .columns( 1 )
        .search(neg_filter, true, false );

    reDrawTable(name);
}


// Redraw Table but maintain scroll position
function reDrawTable(name, scrollPos){
    var dt = logTables[name];
    var context = $('#' + name).closest('div.log-viewer-wrapper');


    if ( dt.seek == 0 || $('button.autoscroll', context).hasClass('enabled') ) {
        // First load - scroll to bottom
        scrollPos = 9999999;
    }

    if (!scrollPos) {
        // Cache the current position
        scrollPos = $('.dataTables_scrollBody', context).scrollTop();
    }

    dt.dataTable.draw();
    $('.dataTables_scrollBody', context).scrollTop(scrollPos);

    return false;
}

function reloadTable(name) {
    var dt = logTables[name];
    var seek = dt.seek ? dt.seek : 0;
    $.ajax({
        dataType: 'json',
        method: 'POST',
        url: '',
        data: {
            'seek': seek,
            'name': name
        },
        success: function (data) {
            //console.log(data);
            var name = data.name;
            var context = $('#' + name).closest('div.log-viewer-wrapper');

            // Update the logTable
            var dt = logTables[name];

            // Add the lines to the table
            var lines = data.lines;

            // Take the last 500 lines on start
            // lines = lines.slice(Math.max(lines.length - 500, 1));

            console.log(name, "Prune: " + dt.prune);


            if (lines.length) {
                // Update
                for (var i = 0; i < lines.length; i++) {
                    dt.dataTable.row.add({'id': '<div class="rownum">' + dt.rownum + '</div>', 'lines': '<div class="log">' + lines[i] + '</div>'});
                    dt.rownum++;
                }

                reDrawTable(name);
            }

            // Update the seek position for the next reload
            dt.seek = data.seek;

            updateTimer(name);
        }
    });
    // console.log('reloadTableComplete',name);
    return false;
}

function updateTimer(name) {
    var context = $('#' + name).closest('div.log-viewer-wrapper');
    var dt = logTables[name];
    var refreshInterval = dt.refreshInterval;
    // console.log("Updating refresh to " + refreshInterval);
    if ( $('button.autorefresh',context).hasClass('enabled') && refreshInterval > 0 ) {
        dt.refreshTimeout = window.setTimeout(function () {
            reloadTable(name);
        }, dt.refreshInterval);
    } else {
        // Clear it for safety's sake if it was running
        clearTimeout(dt.refreshTimeout);
    }
}

function processLogTableClick() {
    var context = $(this).closest('div.log-viewer-wrapper');
    var name = context.data('name');
    var action = $(this).data('action');
    var dt = logTables[name];

    if (action == 'clear') {
        dt.dataTable.clear().draw();
    }

    if (action == 'reset') {
        dt.dataTable.clear().draw();
        dt.seek=0;
        dt.rownum = 1;
    }

    if (action == 'top') {
        $('.dataTables_scrollBody',context).scrollTop(0);
    }

    if (action == 'bottom') {
        $('.dataTables_scrollBody',context).scrollTop(999999);
    }

    if (action == 'reload') {
        reloadTable(name);
    }

    if (action == 'autoscroll') {
        var btn = $('button.autoscroll',context);
        var status = $(btn).hasClass('enabled');
        $(btn).toggleClass('enabled');
        if (status) {
            setCookie(dt['autoscroll-cookie'],'-1',365);
        } else {
            deleteCookie(dt['autoscroll-cookie']);
        }
    }

    if (action == 'autorefresh') {
        var btn = $('button.autorefresh',context);
        var status = $(btn).hasClass('enabled');
        if (status) {
            $('button', btn.parent()).removeClass('enabled');
            setCookie(dt['autorefresh-cookie'],'-1',365);
        } else {
            $('button', btn.parent()).addClass('enabled');
            deleteCookie(dt['autorefresh-cookie']);
        }
        updateTimer(name);
    }

    if (action == 'prune') {
        console.log('prune click', this);
        var btn = $('button.prune',context);
        var status = $(btn).hasClass('enabled');
        if (status) {
            // Disable
            $('button', btn.parent()).removeClass('enabled');
            deleteCookie(dt['prune-cookie']);
        } else {
            $('button', btn.parent()).addClass('enabled');
            dt.prune = 250;
            setCookie(dt['prune-cookie'], dt.prune, 365);
        }
        // updateTimer(name);
    }


}


function updatePrune() {
    var context = $(this).closest('div.log-viewer-wrapper');
    var name = context.data('name');
    var dt = logTables[name];

    if (btn)

        console.log(prune);
    var prune = $(this).data('prune');
    console.log(this,prune);

    var badge = $('span.badge.prune-level', context).html(prune);

    dt.prune = prune;
    setCookie(dt['prune-cookie'], dt.prune, 365);
}


function updateRefreshInterval() {
    var refreshInterval = $(this).data('interval');
    if (isNumeric(refreshInterval)) {
        var context = $(this).closest('div.log-viewer-wrapper');
        var name = context.data('name');
        var dt = logTables[name];
        dt.refreshInterval = refreshInterval;
    }
}


// A single object to store the datatables
var logTables = {};

function datatable_setup(name) {

    console.log("Setting up datatable " + name);

    // Set up a place to store reference for this logTable
    var dt = logTables[name] = {};

    // Get the container for this id
    var context = $('div.log-viewer-wrapper[data-name="' + name + '"]');
    var controls = $('div.controls', context);
    var table = $('#' + name, context)

    // Declare DataTable
    dt['dataTable'] = table.DataTable(
        {
            "order": [[ 0, "asc" ]],
            "scrollY": "50vh",
            "scrollCollapse": true,
            "paging": false,
            "columns": [
                {   "data": "id" },
                {
                    "data": "lines",
                    "className": "line"
                }
            ]
        }
    );
    dt.rownum = 1;
    dt.seek = 0;
    dt.path = context.data('path');


    // console.log("Setting up action buttons",controls);
    // Bind action of all control buttons
    $('button', controls).bind('click', processLogTableClick);

    // Refresh Interval
    $('li a.interval', controls).bind('click', updateRefreshInterval);
    dt.refreshInterval = 2000; // default to 2 seconds

    // Prune rows
    $('li a.prune', controls).bind('click', updatePrune);

    // Initialize cookie
    dt['autoscroll-cookie'] = 'log-viewer-autoscroll-' + name;
    dt['autorefresh-cookie'] = 'log-viewer-autorefresh-' + name;
    dt['prune-cookie'] = 'log-viewer-prune-' + name;
    if (getCookie(dt['autoscroll-cookie']) == -1) $('.autoscroll', controls).trigger('click');
    if (getCookie(dt['autorefresh-cookie']) == -1) $('.autorefresh', controls).trigger('click');
    if (prune = getCookie(dt['prune-cookie'])) {
        dt.prune = prune;
        $('.prune', controls).trigger('click');
    }

    // Load the tables
    reloadTable(name);
    // updateTimer(name);

    // Add exclude filter
    var excludeInput = $('input.exclude', context)
        .on('change', excludeSearch)
        .bindWithDelay("keyup", excludeSearch, 1000, true)
        .parent().appendTo('#' + name + '_filter');

    var leftHeaderBox =  $('div.row:first div.col-sm-6:first', context);
    leftHeaderBox.removeClass('col-sm-6').addClass('col-sm-12 col-xl-12 col-md-12');
    var rightHeaderBox = leftHeaderBox.next();
    rightHeaderBox.removeClass('col-sm-6').children().prependTo(leftHeaderBox); //addClass('foo'); //.appendTo(leftHeaderBox); //.addClass('col-sm-8');
    controls.prependTo(leftHeaderBox);




    // Setup highlighting
    //https://stackoverflow.com/questions/35547647/how-to-make-datatable-row-or-cell-clickable
    $('table.log-table tbody', context).on('dblclick','tr', function() { $(this).toggleClass('highlight'); });

    // Fix Search
    $('input[type="search"]', context).attr('type','text').prop('placeholder','Search');

}


