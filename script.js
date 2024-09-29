const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");

const socket = new WebSocket('ws://localhost:8080');

const clientId = `client-${Date.now()}`;



function sendTask(task) {
    socket.send(JSON.stringify(task));
}

function addTask() {
    if (inputBox.value.trim() === '') {
        alert("You must write something!");
    } else {
        let li = document.createElement("li");
        li.textContent = inputBox.value;

        li.id = `task-${Date.now()}`;
        li.draggable = true;

        listContainer.appendChild(li);

        let span = document.createElement("span");
        span.innerHTML = `\u00d7`;
        li.appendChild(span);

        addDragAndDropHandlers(li);

        sendTask({ action: 'add', id: li.id, text: inputBox.value, checked: false });
    }
    inputBox.value = "";
    saveData();
}

inputBox.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addTask();
    }
});

socket.onmessage = function(event) {
    try {
        const task = JSON.parse(event.data);

        if (task.action === 'add') {
            addTaskToList(task);
        } else if (task.action === 'update') {
            updateTaskStatus(task);
        } else if (task.action === 'delete') {
            deleteTaskFromList(task);
        } else if (task.action === 'drag') {
            if (task.clientId !== clientId) {
                dragItem(task);
            }
        } else if (task.action === 'draggingEnded') {
            if(task.clientId !== clientId) {
                listTasks(task.tasks);
                console.log('should bee reordering');
                console.log(`${task.order}`);
            }
        } 
    } catch (e) {
        console.error("Failed to parse message from server:", e);
    }
};

function addTaskToList(task) {
    const existingTask = document.getElementById(task.id);
    if (existingTask) return;

    let li = document.createElement("li");
    li.textContent = task.text;
    li.id = task.id;
    li.draggable = true;

    if (task.checked) {
        li.classList.add("checked");
    }

    listContainer.appendChild(li);

    let span = document.createElement("span");
    span.innerHTML = `\u00d7`;
    li.appendChild(span);

    addDragAndDropHandlers(li);
}

function updateTaskStatus(task) {
    const li = document.getElementById(task.id);
    if (li) {
        li.classList.toggle("checked", task.checked);
    }
}

function deleteTaskFromList(task) {
    const li = document.getElementById(task.id);
    if (li) {
        li.remove();
    }
}


function listTasks(tasks) {

    while (listContainer.firstChild) {
        listContainer.removeChild(listContainer.firstChild);
    }

    tasks.forEach(task => {
        addTaskToList(task);
    })
}
 
function dragItem(task) {
    const draggableElement = document.getElementById(task.id);
    if (draggableElement) {
        draggableElement.style.position = 'absolute';
        draggableElement.style.top = `${task.posY}px`;
    } else {
        console.error("Element not found for ID:", task.id);
    }
}


listContainer.addEventListener("click", function (e) {
    if (e.target.tagName === "LI") {
        e.target.classList.toggle("checked");
        const checked = e.target.classList.contains("checked");
        sendTask({ action: 'update', id: e.target.id, checked });
        saveData();
    } else if (e.target.tagName === "SPAN") {
        const taskId = e.target.parentElement.id;
        sendTask({ action: 'delete', id: taskId });
        e.target.parentElement.remove();
        saveData();
    }
}, false);

function getTasks() {
    let tasks = [];
    listContainer.querySelectorAll("li").forEach(li => {
        tasks.push({
            id: li.id,
            text: li.firstChild.textContent,
            checked: li.classList.contains("checked")
        });
    });
    return tasks;
}

function saveData() {
    localStorage.setItem("tasks", JSON.stringify(getTasks()));
}

function showTask() {
    let tasks = JSON.parse(localStorage.getItem("tasks"));
    if (tasks) {
        tasks.forEach(task => {
            addTaskToList(task);
        });
    }
}
showTask();

function addDragAndDropHandlers(item) {
    item.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        setTimeout(() => {
            e.target.classList.add('hide');
        }, 0);
    });


    item.addEventListener('drag', function (e) {
        const draggingTask = document.getElementById(e.target.id);
        if (e.clientX !== 0 && e.clientY !== 0) {
            sendTask({ action: 'drag', id: e.target.id, posY: e.clientY, clientId: clientId });
        }
    });

    item.addEventListener('dragend', function (e) {
        e.target.classList.remove('hide');
    });

    item.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    item.addEventListener('drop', function (e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggableElement = document.getElementById(id);

        // Determine where to drop the draggable element
        const mouseY = e.clientY;
        const dropzone = e.target;

        const boundingRect = dropzone.getBoundingClientRect();
        const offsetY = boundingRect.top + (boundingRect.height / 2);

        // Reorder tasks based on where the item was dropped
        if (mouseY < offsetY) {
            listContainer.insertBefore(draggableElement, dropzone);
            let order = [...listContainer.querySelectorAll("li")].map(li => li.id);
            sendTask({ action: 'draggingEnded', clientId: clientId, insertBeforeId: dropzone.id, tasks: getTasks() })
            console.log('drag ended');
            console.log(`${order}`);
        } else {
            listContainer.insertBefore(draggableElement, dropzone.nextSibling);
            let order = [...listContainer.querySelectorAll("li")].map(li => li.id);
            sendTask({ action: 'draggingEnded', clientId: clientId, insertBeforeId: dropzone.nextSibling.id, tasks: getTasks() })
            console.log('drag ended');
            console.log(`${order}`);
        }

        
        
        //sendTask({ action: 'reorder', order });

        saveData();
    });
}