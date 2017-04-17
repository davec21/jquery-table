// Variables / data sotrage
var editRowId = 0;
var currTabIndex = 0;

// Not going to be super flexible but for now...
var tableId = '';
var tableModalId = '';
var detailModalId = '';

function showTable(data) {
    // Create the table and the modal for editing
    createForm(data);
    createTable(data);

    // Set the table body elements to be sortable
    $('tbody').sortable({
        connectWith: '#delete',
        update: function (event, ui) {
            rowDropped(data, ui.item.startPos, ui.item.index());
        },
        start: function (event, ui) {
            ui.item.startPos = ui.item.index();
        }
    });

    // The delete button
    $('#delete').sortable({
        update: function (event, ui) {
            deleteRow(data, ui.item.startPos);
            ui.item.remove();
        },
        cancel: ".ui-state-disabled"
    });

    // On modal close, we re-draw the table to show any updates
    $('.modal').on('hidden.bs.modal', function (e) {
        fillTableRows(data, tableId);
    });

    // present the modal
    presentTableModal();
}

function init(dataUrl) {

    $.ajax({
        type: "get",
        url: dataUrl,
        dataType: "json",
        success: function (response) {
            // Data retrieved succesfully!
            console.log('Data fetched successfully. Begin parse.', response);
            showTable(response);
        }
    });
}

function save(data) {

    // Don't proceed if invalid field
    if (data.hasInvalidField) {
        return;
    }

    console.log(data);
}

function makeElement(type, text, className, attributes, events) {
    var e = document.createElement(type);
    e.className = className;
    var keys, i;
    if (attributes) {
        keys = Object.keys(attributes);
        for (var i = 0; i < keys.length; i++)
            e.setAttribute(keys[i], attributes[keys[i]]);
    }
    if (events) {
        keys = Object.keys(events);
        for (var i = 0; i < keys.length; i++)
            e.addEventListener(keys[i], events[keys[i]]);
    }

    e.innerHTML = text;
    return e;
}

function createModal(data, title, prevButton, nextButton, deleteButton) {

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
        }, {
            click: function () {
                previousRow(data);
            }
        })
    ];

    if (prevButton) {
        bodyElements = [
            makeElement('button', 'Previous Row', 'btn btn-primary', null, {
                click: function () {
                    previousRow(data);
                }
            })
        ].concat(bodyElements);
    }

    if (deleteButton) {
        bodyElements.push(makeElement('button', 'Delete Row', 'btn btn-danger', null, {
            click: function () {
                deleteRow(data, editRowId);
                nextRow(data);
            }
        }));
    }

    if (nextButton) {
        bodyElements.push(makeElement('button', 'Next Row', 'btn btn-primary', null, {
            click: function () {
                nextRow(data);
            }
        }));
    }

    modalFooter.innerHTML = '';
    for (var i = 0; i < bodyElements.length; i++)
        modalFooter.append(bodyElements[i]);

    modalContent.appendChild(modalFooter);

    // Return the modal
    return modalElement;
}


function createForm(data) {

    // First create the modal the form will live in 
    var detailModal = createModal(data, 'Edit Row', true, true, true);
    detailModalId = detailModal.getAttribute('id');

    var formBody = $(detailModal).find('.modal-body');
    formBody.html('');

    // Basically just loop the columns and make inputs for the data
    for (var i = 0; i < data.columns.length; i++) {

        // Create the form group
        var formElement = document.createElement('div');
        formElement.setAttribute('class', 'form-group');
        $(formElement).html('<label for="exampleInputEmail1">' + data.columns[i].name + '</label>');

        // Generate the input
        var input = createInput(data, i, -1);
        input.setAttribute('class', 'form-control');
        input.setAttribute('id', detailModalId + '-dval-' + i);

        // then append it all
        formElement.appendChild(input);
        formBody.append(formElement);
    }

    $('.content').append(detailModal);
}

function createTable(data) {

    // generate the modal window that will contain our table
    var tableModal = createModal(data, 'View Data', false, false, false);
    tableModalId = tableModal.getAttribute('id');

    var modalBody = $(tableModal).find('.modal-body');
    var tableContainer = document.createElement('div');
    tableContainer.setAttribute('class', 'container table-wrapper');

    var btn = document.createElement('button');
    btn.className = 'btn btn-small btn-success';
    btn.addEventListener('click', function () {
        addNewRow(data);
    });
    btn.innerHTML = 'Add Row';
    tableContainer.append(btn);

    var btn = document.createElement('button');
    btn.className = 'btn btn-small btn-primary';
    btn.addEventListener('click', function () {
        save(data);
    });
    btn.innerHTML = 'Submit';
    tableContainer.append(btn);

    var deleteIcon = document.createElement('button');
    deleteIcon.className = 'btn btn-small btn-danger';
    deleteIcon.id = 'delete';
    deleteIcon.innerHTML = '<span class="glyphicon glyphicon-trash ui-state-disabled"></span> Drop to Delete';
    tableContainer.append(deleteIcon);

    tableId = 'tbl-' + $('table').length;
    console.log('Generating table with ID:', tableId);


    // Create the base table element
    var table = document.createElement('table');
    table.setAttribute('id', tableId);

    var header = document.createElement('thead');
    table.appendChild(header);

    var body = document.createElement('tbody');
    table.appendChild(body);

    var headerRow = document.createElement('tr');
    header.appendChild(headerRow);

    var numCol = document.createElement('th');
    numCol.setAttribute('class', 'dark');
    headerRow.appendChild(numCol);

    data.columns.forEach(function (column) {

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

    fillTableRows(data);
}



function fillTableRows(data) {
    var tableBody = $('#' + tableId + ' > tbody');
    tableBody.html('');

    // Then do the rows
    for (var x = 0; x < data.data.length; x++) {

        // create the row element
        var tableRow = document.createElement('tr');
        tableRow.setAttribute('id', 'row-' + x);

        // Create the number cell
        var numCell = document.createElement('td');
        numCell.setAttribute('class', 'dark');
        $(numCell).html(x + 1);
        tableRow.appendChild(numCell);

        for (var i = 0; i < data.columns.length; i++) {
            var cell = document.createElement('td');
            cell.appendChild(createInput(data, i, x));
            tableRow.appendChild(cell);
        }

        tableBody.append(tableRow);
    }
}

function createInput(data, columnId, rowId) {

    var column = data.columns[columnId];
    var row = data.data[rowId > 0 ? rowId : 0];
    var rowVal = row[columnId];

    // to prevent undefined
    if (!rowVal) {
        rowVal = '';
    }

    var inputEle;

    // Check for an input field on the JSON Data
    if (column.input) {
        if (column.input.type === 'select') {

            // Just a smaller reference for the code
            var values = column.input.data.values;
            var displays = column.input.data.displays;

            // Create our select box
            inputEle = document.createElement('select');
            inputEle.addEventListener('change', function () {
                endEdit(data, rowId, inputEle);
            });

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
        inputEle.addEventListener('dblclick', function () {
            editRow(data, rowId);
        });
        inputEle.addEventListener('blur', function () {
            endEdit(data, rowId, inputEle);
        });

        switch (column.datatype) {
            case "string":
                inputEle.setAttribute('type', 'text');
                break;
            case "json":
                if (rowVal !== '') {
                    rowVal = JSON.stringify(rowVal);
                }
                inputEle.setAttribute('type', 'text');
                break;
            case "number":
                inputEle.setAttribute('type', 'number');
                break;
            case "date":
                inputEle.setAttribute('type', 'date');
                break;
        }

        inputEle.setAttribute('value', rowVal);
    }

    // finish up the input with the common properties
    inputEle.setAttribute('class', 'bound-value');
    inputEle.setAttribute('data-col', columnId);
    inputEle.setAttribute('data-old', rowVal);
    inputEle.addEventListener('dblclick', function () {
        editRow(data, rowId);
    });
    inputEle.addEventListener('keydown', function (event) {
        // Escape = cancel edits return to default, delete = delete the row
        if (event.key === 'Escape') {
            cancelEdit(event.target);
        } else if (event.key === 'Delete') {
            $(event.target).blur();
            deleteRow(data, rowId);
        }
    });

    inputEle.setAttribute('tabIndex', (columnId + 1) + (rowId * data.columns.length));

    // return it
    return inputEle;
}

function addNewRow(data) {
    if (!data.hasInvalidField) {
        data.data.push(new Array(data.columns.length));
        fillTableRows(data);
    }
}

function deleteRow(data, rowId) {
    // Remove the row fom the array and reload the table
    data.data.splice(rowId, 1);
    $('#row-' + rowId).remove();

    for (var i = rowId + 1; i <= data.data.length; i++) {
        var row = $('#row-' + i);
        var ele = row.find('.dark').text(i);
        row.attr('id', 'row-' + (i - 1));
    }
}

function editRow(data, rowId) {

    editRowId = rowId;
    var columns = data.columns;

    // For each item in the row set the value on the input
    for (var i = 0; i < columns.length; i++) {

        // Parse the value from the row
        var val = data.data[rowId][i];
        if (val != '' && columns[i].datatype === 'json') {
            val = JSON.stringify(val);
        }

        // Update the form input
        var formInput = $('#' + detailModalId + '-dval-' + i);
        formInput.val(val);
        formInput.attr('data-col', i);
        formInput.attr('data-old', val);
    }

    // present the modal
    $('#' + detailModalId).css('z-index', '9000').modal('show');
}

function endEdit(data, rowId, input) {
    // Enusre we have an input element
    var inputEle = $(input);
    if (!inputEle) {
        return;
    }

    // rowId -1 means it was from the edit form
    if (rowId === -1) {
        rowId = editRowId;
    }

    // Get the column/row info 
    var columnId = inputEle.attr('data-col');
    var column = data.columns[columnId];

    // Pull the values out
    var oldVal = inputEle.attr('data-old');
    var newVal = inputEle.val();

    // If we changed the value, test for valid
    if (oldVal !== newVal && !validateInput(newVal, column)) {
        // Not valid, highlight the cell, focus, and flag invalid
        inputEle.css('border', '2px solid red');
        inputEle.focus();
        data.hasInvalidField = true;
        return;
    }

    // Ensure we store the JSON parsed value 
    if (column.datatype === 'json' && newVal.length > 0) {
        newVal = JSON.parse(newVal);
    }

    // Update the array and the current input value
    inputEle.css('border', '');
    data.data[rowId][columnId] = newVal;
    inputEle.attr('data-old', newVal);
    data.hasInvalidField = false;
}

function cancelEdit(input) {
    // Set the value to the original value
    var inputEle = $(input);
    inputEle.val(inputEle.attr('data-old'));
}

function nextRow(data) {
    // Don't proceed if invalid field
    if (!data.hasInvalidField) {
        // Set the next rowID
        var newId = editRowId + 1;
        if (newId >= data.data.length) {
            newId = data.data.length - 1;
        }

        // can only progress if we have items
        if (newId >= 0) {
            editRow(data, newId);
        } else {
            // if no items, then the detail modal should close
            $('#' + detailModalId).modal('hide');
        }
    }
}

function previousRow(data) {
    // Don't proceed if invalid field
    if (!data.hasInvalidField) {
        // Set the next rowID
        var newId = editRowId - 1;
        if (newId < 0) {
            newId = 0;
        }

        editRow(data, newId);
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

function rowDropped(data, oldIndex, newIndex) {
    // If no change, no need to parse
    if (oldIndex === newIndex) {
        return;
    }

    // Move the old row index to the new one
    var rowData = data.data[oldIndex];
    data.data.splice(oldIndex, 1);
    data.data.splice(newIndex, 0, rowData);

    // refresh the table
    fillTableRows(data);
}

function presentTableModal() {
    // present the data table
    $('#' + tableModalId).modal('show');
}