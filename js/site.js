/** Main entry point  */
function init(dataUrl) {
    'use strict';

    // context (state)
    var context = {
        hasInvalidField: false,
        tabIndex: 0,
        rows: [],
        columns: [],
        deletedRows: [] // array of rowId's that have been removed in reverse order
    }

    // Pull down the data
    $.ajax({
        type: "get",
        url: dataUrl,
        dataType: "json",
        success: function (response) {
            // Data retrieved succesfully!
            console.log('Data fetched from url: ' + dataUrl + ' successfully. Begin parse.', response);
            context.rows = response.data;
            context.columns = response.columns;

            // render our data
            showTable(context);
        }
    });
}

function showTable(ctx) {

    // Create the data table and the detail modal
    createForm(ctx);
    createTable(ctx);

    // Set the table body elements to be sortable
    $('tbody').sortable({
        connectWith: '#delete',
        stop: function (event, ui) {
            if (!ui.item.delete) {
                rowDropped(ctx, ui.item.startPos, ui.item.index());
            } else {
                $('tbody').sortable("cancel");
            }
        },
        start: function (event, ui) {
            ui.item.startPos = ui.item.index();
        }
    });

    // The delete button
    $('#delete').sortable({
        receive: function (event, ui) {
            ui.item.delete = true; // flag we are removing it
            deleteRow(ctx, ui.item);
        },
        revert: true,
        cancel: ".ui-state-disabled"
    });

    // On modal close, we re-draw the table to show any updates
    $('.modal').on('hidden.bs.modal', function (e) {
        fillTableRows(ctx);
    });

    // present the modal
    presentTableModal(ctx);
}

function save(ctx) {

    // Don't proceed if invalid field
    if (ctx.hasInvalidField) {
        return;
    }

    // The object we are saving
    var toSave = {
        columns: ctx.columns,
        data: []
    };

    // Loop all rows, exclude the ones that are deleted
    for (var i = 0; i < ctx.rows.length; i++) {
        if (ctx.rows[i].deleted) {
            continue;
        }

        toSave.data.push(ctx.rows[i]);
    }

    console.log(toSave, ctx);
}

function makeElement(type, text, className, attributes, events) {

    // Create the element
    var e = document.createElement(type);
    e.className = className;

    var keys, i;

    // Add any attributes
    if (attributes) {
        keys = Object.keys(attributes);
        for (i = 0; i < keys.length; i++) {
            e.setAttribute(keys[i], attributes[keys[i]]);
        }
    }

    // Add any events
    if (events) {
        keys = Object.keys(events);
        for (i = 0; i < keys.length; i++) {
            e.addEventListener(keys[i], events[keys[i]]);
        }
    }

    // Set the body and return the element
    e.innerHTML = text;
    return e;
}

function createModal(ctx, title, prevButton, nextButton, deleteButton) {
    var modalId = 'mdl-' + $('.modal').length;
    console.log('Generating modal with ID:', modalId);

    // Start with the outer element
    var modalElement = document.createElement('div');
    modalElement.setAttribute('id', modalId);
    modalElement.setAttribute('class', 'modal fade');
    modalElement.setAttribute('tabindex', '-1');
    modalElement.setAttribute('data-keyboard', 'false');
    modalElement.setAttribute('role', 'dialog');
    modalElement.setAttribute('aria-labelledby', 'myModalLabel');

    // Inner dialog stuff
    var modalDialog = document.createElement('div');
    modalDialog.setAttribute('class', 'modal-dialog');
    modalDialog.setAttribute('role', 'document');
    modalElement.appendChild(modalDialog);

    // Body of the modal
    var modalContent = document.createElement('div');
    modalContent.setAttribute('class', 'modal-content');
    modalDialog.appendChild(modalContent);

    // Header section
    var modalHeader = document.createElement('div');
    modalHeader.setAttribute('class', 'modal-header');
    modalHeader.innerHTML =
        '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        '<h4 class="modal-title" id="myModalLabel">' + title + '</h4>' +
        '</div>';

    modalContent.appendChild(modalHeader);

    // Body of it
    var modalBody = document.createElement('div');
    modalBody.setAttribute('class', 'modal-body');

    modalContent.appendChild(modalBody);

    var modalFooter = document.createElement('div');
    modalFooter.setAttribute('class', 'modal-footer');

    var bodyElements = [
        makeElement('button', 'Close', 'btn btn-default', {
            'data-dismiss': 'modal'
        })
    ];

    if (prevButton) {
        bodyElements = [
            makeElement('button', 'Previous Row', 'btn btn-primary', null, {
                click: function () {
                    previousRow(ctx);
                }
            })
        ].concat(bodyElements);
    }

    if (deleteButton) {
        bodyElements.push(makeElement('button', 'Delete Row', 'btn btn-danger', null, {
            click: function () {
                deleteRow(ctx);
                nextRow(ctx);
            }
        }));
    }

    if (nextButton) {
        bodyElements.push(makeElement('button', 'Next Row', 'btn btn-primary', null, {
            click: function () {
                nextRow(ctx);
            }
        }));
    }

    modalFooter.innerHTML = '';
    for (var i = 0; i < bodyElements.length; i++) {
        modalFooter.append(bodyElements[i]);
    }

    modalContent.appendChild(modalFooter);

    // Return the modal
    return modalElement;
}


function createForm(ctx) {
    // First create the modal the form will live in 
    var detailModal = createModal(ctx, 'Edit Row', true, true, true);
    ctx.detailModalId = detailModal.getAttribute('id');

    var formBody = $(detailModal).find('.modal-body');
    formBody.html('');

    // Basically just loop the columns and make inputs for the data
    for (var i = 0; i < ctx.columns.length; i++) {

        // Create the form group
        var formElement = document.createElement('div');
        formElement.setAttribute('class', 'form-group');
        $(formElement).html('<label for="exampleInputEmail1">' + ctx.columns[i].name + '</label>');

        // Generate the input
        var input = createInput(ctx, i, null);
        input.addEventListener('change', function (event) {
            endEdit(ctx);
        });

        input.setAttribute('class', 'form-control');
        input.setAttribute('id', ctx.detailModalId + '-dval-' + i);

        // then append it all
        formElement.appendChild(input);
        formBody.append(formElement);
    }

    $('.content').append(detailModal);
}

function createTable(ctx) {
    // generate the modal window that will contain our table
    var tableModal = createModal(ctx, 'View Data', false, false, false);
    ctx.tableModalId = tableModal.getAttribute('id');

    var modalBody = $(tableModal).find('.modal-body');
    var tableContainer = document.createElement('div');
    tableContainer.setAttribute('class', 'container table-wrapper');

    var btn = document.createElement('button');
    btn.className = 'btn btn-small btn-success';
    btn.addEventListener('click', function () {
        addNewRow(ctx);
    });
    btn.innerHTML = 'Add Row';
    tableContainer.append(btn);

    var btn = document.createElement('button');
    btn.className = 'btn btn-small btn-primary';
    btn.addEventListener('click', function () {
        save(ctx);
    });
    btn.innerHTML = 'Submit';
    tableContainer.append(btn);

    var deleteIcon = document.createElement('button');
    deleteIcon.className = 'btn btn-small btn-danger';
    deleteIcon.id = 'delete';
    deleteIcon.innerHTML = '<span class="glyphicon glyphicon-trash ui-state-disabled"></span> Drop to Delete';
    tableContainer.append(deleteIcon);

    ctx.tableId = 'tbl-' + $('table').length;
    console.log('Generating table with ID:', ctx.tableId);

    // Create the base table element
    var table = document.createElement('table');
    table.setAttribute('id', ctx.tableId);

    var header = document.createElement('thead');
    table.appendChild(header);

    var body = document.createElement('tbody');
    body.addEventListener('dblclick', function (event) {
        ctx.currentRow = $(event.target.closest('tr'));
        ctx.currentRow.id = ctx.currentRow.attr('_row_id');
        editRow(ctx);
    });

    body.addEventListener('change', function (event) {
        endEdit(ctx, event.target);
    });

    body.addEventListener('blur', function () {
        endEdit(ctx, event.target);
    });

    body.addEventListener('keydown', function (event) {
        // Escape = cancel edits return to default, delete = delete the row
        if (event.key === 'Escape') {
            cancelEdit(event.target);
        }
    });

    table.appendChild(body);

    var headerRow = document.createElement('tr');
    header.appendChild(headerRow);

    var numCol = document.createElement('th');
    numCol.setAttribute('class', 'dark');
    headerRow.appendChild(numCol);

    ctx.columns.forEach(function (column) {

        // Test for and evaluate the validation function if needed
        var cache = {};
        if (column.validationFunc) {
            eval('cache.validationFunc = ' + column.validationFunc);
        } else if (column.datatype === 'json') {
            cache.validationFunc = validateJsonInput;
        }

        column._cache = cache;

        // generate the column
        var col = document.createElement('th');
        col.setAttribute('class', 'dark');
        col.innerHTML = column.name;
        headerRow.appendChild(col);

    });


    tableContainer.appendChild(table);
    modalBody.html(tableContainer);

    $('.content').append(tableModal);

    fillTableRows(ctx);
}



function fillTableRows(ctx) {
    var tableBody = $('#' + ctx.tableId + ' > tbody');
    tableBody.html('');

    // Then do the rows
    var cell, input;
    for (var x = 0; x < ctx.rows.length; x++) {

        // create the row element
        var tableRow = document.createElement('tr');
        // tableRow.setAttribute('id', 'row-' + x);
        tableRow.setAttribute('_row_id', x);

        if (ctx.rows[x].deleted) {
            tableRow.setAttribute('style', 'display:none');
        }

        // Create the number cell
        var cell = document.createElement('td');
        cell.setAttribute('class', 'dark');
        $(cell).html(x + 1);
        tableRow.appendChild(cell);

        for (var i = 0; i < ctx.columns.length; i++) {
            cell = document.createElement('td');
            cell.appendChild(createInput(ctx, i, ctx.rows[x][i]));
            tableRow.appendChild(cell);
        }

        tableBody.append(tableRow);
    }
}

function createInput(ctx, columnId, rowVal) {
    var column = ctx.columns[columnId];
    var inputEle;

    // Check for an input field on the JSON Data
    if (column.input) {
        if (column.input.type === 'select') {

            // Just a smaller reference for the code
            var values = column.input.data.values;
            var displays = column.input.data.displays;

            // Create our select box
            inputEle = document.createElement('select');

            // make our options
            for (var i = 0; i < values.length; i++) {
                var optionEle = document.createElement('option');
                optionEle.setAttribute('value', values[i]);

                if (values[i] === rowVal) {
                    optionEle.setAttribute('selected', 'true');
                }

                // Add it to the input
                $(optionEle).html(displays[i]);
                inputEle.appendChild(optionEle);
            }
        }
    } else {
        // Based on column type we parse the value a bit differently
        inputEle = document.createElement('input');

        switch (column.datatype) {
            case "number":
            case "date":
                inputEle.setAttribute('type', column.datatype);
                break;
            case "string":
            case "json":
                inputEle.setAttribute('type', 'text');
                if (column.datatype == "json" && rowVal && rowVal.constructor != String) {
                    rowVal = JSON.stringify(rowVal);
                }
                break;
        }
        if (rowVal != null && rowVal != undefined)
            inputEle.setAttribute('value', rowVal);
    }

    // finish up the input with the common properties
    inputEle.setAttribute('class', 'bound-value');
    inputEle.setAttribute('data-old', rowVal);
    inputEle.setAttribute('tabIndex', ctx.tabIndex++);

    // return it
    inputEle.setAttribute('_colIndex', columnId);
    return inputEle;
}

function addNewRow(ctx) {
    if (ctx.hasInvalidField) {
        return;
    }

    // push an empty row into the rows array and rebuild the table
    ctx.rows.push(new Array(ctx.columns.length));
    fillTableRows(ctx);
}

function null_or_first(x) {

    if (x && x.constructor == Array && x.length > 0) {
        return $(x[0]);
    } else if (x) {
        return $(x);
    }

    return null;
}

function deleteRow(ctx, target) {

    if (target) {
        ctx.currentRow = null_or_first(target.closest('tr'));
        ctx.currentRow.id = ctx.currentRow.attr('_row_id');
    }

    // Hide the current row
    ctx.currentRow.css('display', 'None');

    // Flag as deleted
    var rowId = +ctx.currentRow.attr('_row_id')
    ctx.rows[rowId].deleted = true;
    ctx.deletedRows.unshift(rowId);

    for (var i = rowId; i < ctx.rows.length + 1; i++) {
        // TO DO fix the row numbers
    }
}

function editRow(ctx) {
    var columns = ctx.columns;

    // For each item in the row set the value on the input
    for (var i = 0; i < columns.length; i++) {
        // Parse the value from the row
        var val = ctx.rows[ctx.currentRow.attr('_row_id')][i];
        if (columns[i].datatype === 'json' && val && val.constructor != String) {
            val = JSON.stringify(val);
        }

        // Update the form input
        var formInput = $('#' + ctx.detailModalId + '-dval-' + i);
        if (val != null && val != undefined) {
            formInput.val(val);
        }

        // Update the old attribute
        formInput.attr('data-old', val);
    }

    // present the modal
    $('#' + ctx.detailModalId).css('z-index', '9000').modal('show');
}

function endEdit(ctx, target) {
    if (target) {
        ctx.currentInput = null_or_first(target.closest('input'));
        ctx.currentRow = null_or_first(target.closest('tr'));
        ctx.currentRow.id = ctx.currentRow.attr('_row_id');
    }

    var inputEle = ctx.currentInput;
    if (!inputEle) {
        ctx.hasInvalidField = false;
        return true;
    }

    // Get the column/row info 
    var columnId = parseInt(inputEle.attr('_colIndex'));
    var column = ctx.columns[columnId];

    // Pull the values out
    var oldVal = inputEle.attr('data-old');
    var newVal = inputEle.val();

    // If we changed the value, test for valid
    if (oldVal !== newVal && !validateInput(newVal, column)) {
        // Not valid, highlight the cell, focus, and flag invalid
        inputEle.css('border', '2px solid red');
        inputEle.focus();
        ctx.hasInvalidField = true;
        return;
    }

    // Ensure we store the JSON parsed value 
    if (column.datatype === 'json' && newVal.length > 0) {
        newVal = JSON.parse(newVal);
    }

    // Update the array and the current input value
    inputEle.css('border', '');
    ctx.rows[ctx.currentRow.attr('_row_id')][columnId] = newVal;
    inputEle.attr('data-old', newVal);
    ctx.hasInvalidField = false;
}

function cancelEdit(input) {
    // Set the value to the original value
    var inputEle = $(input);
    inputEle.val(inputEle.attr('data-old'));
}

function nextRow(ctx) {
    if (ctx.hasInvalidField) { // Don't proceed if invalid field
        return;
    }

    if (ctx.currentRow && ctx.currentRow.next()) {
        var currRow = ctx.currentRow;
        ctx.currentRow = $(ctx.currentRow.next()); // Set the next rowID
        ctx.currentRow.id = ctx.currentRow.attr('_row_id');

        // call this function again if the row was deleted
        if (ctx.rows[ctx.currentRow.id].deleted) {
            nextRow(ctx);
        } else {
            editRow(ctx);
        }
    }
}

function previousRow(ctx) {
    if (ctx.hasInvalidField) { // Don't proceed if invalid field
        return;
    }

    if (ctx.currentRow && ctx.currentRow.prev()) {
        ctx.currentRow = ctx.currentRow.prev(); // Set the next rowID
        ctx.currentRow.id = ctx.currentRow.attr('_row_id');

        // call this function again if the row was deleted
        if (ctx.rows[ctx.currentRow.id].deleted) {
            previousRow(ctx);
        } else {
            editRow(ctx);
        }
    }
}

// Helper functions
function validateInput(newValue, column) {
    // If we have a validation function, use it!
    if (column._cache.validationFunc) {
        return column._cache.validationFunc(newValue);
    }

    // If no validation, then return true
    return true;
}

function validateJsonInput(input) {

    // Ensure we have a value
    if (!input) {
        return false;
    }

    // Test to see if we can convert the input to a json object
    try {
        var y = JSON.parse(input);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function rowDropped(ctx, oldIndex, newIndex) {
    // If no change, no need to parse
    if (oldIndex === newIndex) {
        return;
    }

    // Move the old row index to the new one
    var rowData = ctx.rows[oldIndex];
    ctx.rows.splice(oldIndex, 1);
    ctx.rows.splice(newIndex, 0, rowData);

    // refresh the table
    fillTableRows(ctx);
}

function presentTableModal(ctx) {
    // present the data table
    $('#' + ctx.tableModalId).modal('show');
}