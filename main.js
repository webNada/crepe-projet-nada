//In order to work with this project you need some reasoning skills, a good understanding of javascript and the basics of Three.js and Vue.js
//Flip animation taken from and modified for my needs
//https://codepen.io/boytchev/pen/wvQRERM?editors=1010


// for 3D use of the framework
import Framework from './framework/js/framework.js';

const fw = new Framework();
fw.addButtonToNavbar({textButton : "Règles",onclickFunction: () => showHelpModal()});
fw.addButtonToNavbar({textButton : "Changer de version",onclickFunction: () => {
    (version === 0 ? version = 1 : version = 0);
    initCrepes();
    document.getElementById('version').innerHTML = `Version ${version}`
}});
fw.addButtonToNavbar({textButton : "-1 crêpe",onclickFunction: () => editCrepe(-1)});
fw.addButtonToNavbar({textButton : "+1 crêpe",onclickFunction: () => editCrepe(1)});
const modal1 = fw.getPermanentModal({
    title: "Le crêpier psychorigide",
    position: { top: 10, right: 0 },
    width: "350px",
    theme: "light", // or "dark" 
    id: "gameSettingsModal", 
});
//rajouer un bouton dans le modal avec la méthode addButton
modal1.AddButtonToModal("Recommencer", () => restartCrepes());
modal1.AddButtonToModal("Mélanger", () => randomCrepe());
modal1.AddButtonToModal("Résoudre", () => runRecursiveSolve());


import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let version = 0
// version 0 is the classic game and version 1 is the one that adds a black side on each crepe
// and where these black sides all have to be down in order to win  

//State variables 
let info = false
let number_of_flips = 0
let numbers_of_crepes = 4
let lowest_crepe = 0
let highest_crepe = 0
let solving = false // is used to disable the buttons during the animation
let won = false // is used to check if the game is over
let sec = 0
var timer = 0

function chrono(bool){ // if true we run the timer else we stop it
    let safeTimerDisplay = document.getElementById('safeTimerDisplay')
    if (timer!==0) {
        clearInterval(timer);
        sec=0
    }
    if (!bool) return
    safeTimerDisplay.innerHTML = 'Chrono : 00:00'
    timer = setInterval( function(){
        sec++;
        if (sec > 600) { clearInterval(timer);}
        safeTimerDisplay.innerHTML = "Chrono : "
        safeTimerDisplay.innerHTML += ((sec/60<10)? '0' : '') + Math.floor(sec/60) + ':' + ((sec%60<10)? '0' : '') + sec%60;
    }, 1000);
}

// Three.js Parameters
let raycaster= new THREE.Raycaster();
let light;
let camera;
let renderer;
let controls;
const pointer = new THREE.Vector2(Infinity, Infinity); // gives the offset from Raycaster to the Camera
const group = new THREE.Group();
const load = new THREE.TextureLoader(); //Loads the textures for the crepes

// Arrays to store the crepes and their positions
let crepes = []
let table = []
let restart_table = []

// Textures of the crepes so that they are already loaded
const pair = new THREE.MeshBasicMaterial({ map : load.load('./src/textures/Oakcrepe.png') });
const pair_side = new THREE.MeshLambertMaterial({ color : 0x494134 });
const impair = new THREE.MeshBasicMaterial({ map : load.load("./src/textures/crepetexture.png") });
const impair_side = new THREE.MeshLambertMaterial( { color: 0xE5B88E });

const pair_bottom = new THREE.MeshBasicMaterial({ map : load.load("./src/textures/Oakcrepe_back.png") });
const impair_bottom = new THREE.MeshBasicMaterial({ map : load.load("./src/textures/crepetexture_back.png") });

let couleur_pair = [pair_side, pair, pair]
let couleur_impair = [impair_side, impair, impair]



  //////////////////////////////
 // Creation of the 3D scene //
//////////////////////////////
window.scene = new THREE.Scene()
window.scene.background = new THREE.Color('gainsboro');
let ambientLight = new THREE.AmbientLight('beige', 0.5);
light = new THREE.DirectionalLight('white', 1);
light.position.set(1, 1, 1);
window.scene.add(light)
window.scene.add(group)
window.scene.add(ambientLight);

fw.startLoadingScreen();
fw.removeLoadingScreen();
fw.onResize();
fw.addSimpleSceneWithTable();

renderer = new THREE.WebGLRenderer({canvas:document.getElementById('canvas'), antialias: true})
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight);
camera.position.set(0, 13, 10);
controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 55;
controls.enableDamping = true;
controls.target.set(0,10,0);
controls.update();
  ////////////////////////////////////////////////
 // Creation of the area underneath the crepes //
////////////////////////////////////////////////
// Source of the textures: Terra Numerica and freepik.com 
// Editing realised by myself
// the next 17 lines can be removed once the framework is done and offers a "support" for the crepes

let loader = new GLTFLoader();
// source of the white plate: https://sketchfab.com/3d-models/white-ceramic-plate-4036111d2c5c47bab2320202d5e9a2a4
loader.load( 
    "./src/models/white_ceramic_plate/scene.gltf",
    function ( gltf ) {
        gltf.scene.scale.set(40 * gltf.scene.scale.x, 40 * gltf.scene.scale.y, 40 * gltf.scene.scale.z)
        gltf.scene.position.y = 10.5;
        window.scene.add( gltf.scene );
    },
    undefined, function ( error ) { console.log( 'erreur',error ); } );
initCrepes(); animate();


//The Fisher-Yates algorithm https://dev.to/codebubb/how-to-shuffle-an-array-in-javascript-2ikj
const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

//initCrepes() Creates a list of crepes based on the variable 'number_of_crepes' then adds them to the Three.js scene.
//Depending on the parity of a crepe's position in the list and the game version, its textures will differ.
function initCrepes() {
    for (let i = 0; i < crepes.length; i++) {
        crepes[i].geometry.dispose()
        window.scene.remove(crepes[i])
    }

    won = false
    number_of_flips = 0
    group.clear()
    restart_table = []
    table = []
    crepes = []

    // Depending on the the version of the game, we give it the correct textures
    if (version === 1) {
        couleur_pair[2] = pair_bottom
        couleur_impair[2] = impair_bottom
    }

    for (let i = numbers_of_crepes - 1; i >= 0; i--) {
        let geometry = new THREE.CylinderGeometry(5 - i / numbers_of_crepes*3, 5 - i / numbers_of_crepes*3, 0.5)
        // creation of the crepe and adding it in different arrays
        let disc
        if (i % 2 === 0) { disc = new THREE.Mesh(geometry, couleur_pair) }
        else { disc = new THREE.Mesh(geometry, couleur_impair) }
         
        disc.position.y = 0.5 * i + 10.9;
        table.push({ id: disc.id, side: 0 })
        restart_table.push({ id: disc.id, y: disc.position.y, side: 0 })
        crepes.push(disc);
        window.scene.add(disc)
    }

    lowest_crepe = table[0].id
    highest_crepe = table[table.length - 1].id
    chrono(true)
}

function randomCrepe() {
    number_of_flips = 0
    solving = true
    while (group.children.length) {
        window.scene.attach(group.children[0]);
    }

    shuffleArray(crepes)
    table = []
    restart_table = []
    let side

    for (let i = crepes.length - 1; i >= 0; i--) {
        side = Math.floor(Math.random() * (version + 1))  // will be equal to 0 or 1
        table.push({ id: crepes[i].id, side: side}) // 0 is white side and 1 is black side
        crepes[i].rotation.set((Math.PI) * side, 0, 0) // if side is 1 then it is 180 degrees else 0
        crepes[i].position.y = 0.5 * i + 10.9;
        restart_table.push({ id: crepes[i].id, y: crepes[i].position.y, side: side })
    }
    solving = false
    chrono(true)
    //initCrepes()
}

function restartCrepes() {
    while (group.children.length) {
        window.scene.attach(group.children[0]);
    }

    table = []
    let low = lowest_crepe
    for (let i = 0; i < restart_table.length; i++) {
        table[i] = { id: restart_table[i].id, side: restart_table[i].side }
        if (table[i].id !== low)  won = false 
        low++
    }

    for (let i = 0; i < restart_table.length; i++) {
        for (let j = 0; j < crepes.length; j++) {
            if (restart_table[i].id === crepes[j].id) {
                crepes[j].rotation.set(0, 0, 0)
                if (restart_table[i].side === 1) {
                    crepes[j].rotation.x += (Math.PI / 2) * 2
                }
                crepes[j].position.set(crepes[j].position.x, restart_table[i].y, crepes[j].position.z)
            }
        }
    }

    number_of_flips = 0
    won = false
    solving = false
    chrono(true)
}

// to set the timer back to 0 when the action bar is clicked
window.addEventListener("DOMContentLoaded", (event) => {
    const actions = document.getElementById('actions_group');
    actions.addEventListener('click', (event) => {
        if (!(event.target.nodeName === 'BUTTON')) { return; }
        chrono(true)
    })
});

// editCrepe() is responsible for clearing the arrays of old crepes as well as the 3D scene.
// It increments or decrements the maximum number of crepes by n depending on the sign of n,
// then calls initCrepes() to recreate them with one additional crepe.
function editCrepe(n) {
    for (let i = 0; i < crepes.length; i++) {
        crepes[i].geometry.dispose()
        window.scene.remove(crepes[i])
    }

    table = []
    crepes = []
    crepes.length = 0
    highest_crepe += n
    numbers_of_crepes += n
    initCrepes()
}

document.addEventListener('mousedown', (event) => {

    if (event.detail === 2 && !solving && !info) {
        pointer.x = ((event.clientX / window.innerWidth) * 2 - 1);
        pointer.y = (-(event.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersection = raycaster.intersectObjects(crepes);

        if (!(intersection.length > 0 && intersection[0].object.type === "Mesh")) return
        while (group.children.length) { window.scene.attach(group.children[0]); }

        group.rotation.z = 0;
        group.position.y = 0;
        solving = true
        let y = intersection[0].object.position.y
        group.position.y = y;

        console.log(`intersect ${intersection[0].object.id}`)
        let index = table.findIndex((crepe) => crepe.id === intersection[0].object.id)
        let j = 0
        while ( j < crepes.length) {
            if (crepes[j].position.y >= y) { group.attach(crepes[j]) }
            j++
        }

        if (version === 1) {
            for (let j = 0; j < i + 1; j++) {
                console.log(j,i,1-table[j].side)
                table[j].side = (table[j].side === 0) ? 1 : 0
            }
        }

        for (let j = 0; j < index / 2; j++) {
            let tmp = table[j]
            table[j] = table[index - j]
            table[index - j] = tmp
        }
            console.log(table)


        flip(group, 300)
        new Tween(group.rotation)
            .to({ z: Math.PI }, 600)
            .onComplete(() => {
                number_of_flips++
                console.log('flip ', number_of_flips)
                solving = false
                let low = lowest_crepe
                let k = 0
                won = true
                console.log("verif",low)
                for (let i = 1; i < table.length; i++) {
                    if (table[i].id <= table[i-1].id) {
                        console.log(table[i].id , table[i-1].id)
                        won = false
                        break
                    }
                }
                if (version === 1) {
                    for (let ii = 0; ii < table.length; ii++) {
                        if (table[ii].side !== 0) {
                            won = false
                            ii = table.length
                        }
                    }
                }
                if (won && number_of_flips!==0) {
                    won = !won
                    alertWon()
                }})
            .start()
    }
}, false);

function handler(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', () => handler(), false); 
window.addEventListener('zoom', () => handler(), false);

function delay(milliseconds) {
    return new Promise(resolve => { setTimeout(resolve, milliseconds); });
}

function flip(group, duration) {
    new Tween(group.position)
        .to({ y: group.position.y + 10 }, duration)
        .easing(Easing.Quadratic.Out)
        .chain(
            new Tween(group.position)
            .to({ y:  group.position.y + (group.children.length - 1) * 0.5 }, duration)
            .easing(Easing.Quadratic.In))
        .start();
}

async function solveAnimation(id) {
    while (group.children.length) { window.scene.attach(group.children[0]); }
    group.rotation.z = 0;
    group.position.y = 0;

    const object = window.scene.getObjectById(id);
    let y = object.position.y
    group.position.y = y;

    let i = 0
    while (i < crepes.length) {
        if (crepes[i].position.y >= y) { group.attach(crepes[i]) }
        i++
    }

    flip(group, 100)

    new Tween(group.rotation).to({ z: Math.PI }, 200).start()
    id = -1
    await delay(600) // if you reduce it, another animation might start before the first one is over
}

// This is the most difficult part of code
// To solve crepes I use recursion

// So you need to sort from crepe of lowest value at the top of the pile to one with the highest value at the bottom.
// they are stored in an array like this: [15, 16, 17, 18] (here they are  already sorted) with 15 at the top and 18 at the bottom
// The trick is to place the biggest crepe at the top if it's not already there

// let's say the array is [15, 17, 16, 18], when you flip at 17 you are flipping also all crepes above
// so it will be [17, 15, 16, 18] then you need to place it to index 2 so you flip at 16
// it becomes [16, 15, 17, 18] and now you need to flip at 15 to place it at beggining

// max crepe is starting at the highest value and then decreases. also the end index k is incrementing by 1 in order to get the wanted position of the crepe
async function solve(max, k) {
    solving = true
    let i = 0
    // I am looking for the biggest crepe's position (max)
    while (i < table.length) {
        if (table[i].id >= max) {
            max = table[i].id
            break
        }
        i++
    }
    // for default version check if the max crepe is the latest crepe if true you have solved!
    // for the V1 you also check the which side is up (table[x].side === 1)
    if (i === 0 && max === table[i].id && k === table.length - 1) {
        if (version === 1) {
            for (let ii = 0; ii < table.length; ii++) {
                if (table[ii].side === 1) {
                    won = false
                    ii = table.length
                }
            }
        }
        if (version === 1 && won || version === 0) {
            solving = false
            return
        }
    }
    // when i = 0, it means that the crepe that we are looking for is at the top of the pile
    if (i === 0) { 
        if (k === table.length - 1) { // means that no more crepe to sort so the game is over!
            // black side version you need to flip it
            if (version === 1 && table[0].side === 0) {
                //we have to put the black side upwards so that it'll face downwards when sorted
                if (table[0].id !== lowest_crepe) {
                    await solveAnimation(table[0].id)
                    table[0].side = 1
                }
            } else {
                let tmp = (table[0] === 1) ? 0 : 1
                table[0] = (table[1] === 1) ? 0 : 1
                table[1] = tmp
            }
            solving = false
            return
        } else {
            //there still are crepes that need to be sorted
            if (version === 1 && table[i].side === 0) {
                await solveAnimation(table[0].id)
                table[0].side = 1
            }
            //swap all positions in an array till the current end index (k)
            for (let j = 0; j < (table.length - k) / 2; j++) {
                let tmp = table[j]
                table[j] = table[table.length - 1 - j - k]
                table[table.length - 1 - j - k] = tmp
            }
            await solveAnimation(table[i].id)

            //swap the sides of the crepes
            if (version === 1) {
                for (let j = 0; j < (table.length - k); j++) {
                    table[j].side = (table[j].side === 0) ? 1 : 0
                }
            }
        }
    }

    // our crepe is not at beggininng means in between till i/2
    // we need to place it to the beginning of array example we look for a crepe 18 [15, 16, 18, 17] we swap all from that i to the beginning [18, 16, 15, 17]

    else if (i > 0 && (table.length - 1 - k) !== i) {
        //  swap all positions till i
        for (let j = 0; j < i / 2; j++) {
            let tmp = table[j]
            table[j] = table[i - j]
            table[i - j] = tmp
        }

        await solveAnimation(max)
        
        // swap all colors till i + 1
        if (version === 1) {
            for (let j = 0; j < i + 1; j++) {
                table[j].side = (table[j].side === 0) ? 1 : 0
            }
        }

        // because it is now at the beginning we need to redo for it
        max += 1
        k--
    }

    //special case for black side crepe if it's at its position you need to flip to the beginning else continue
    else if (i === table.length - 1 - k && version === 1 && table[i].side === 1) {
        await solveAnimation(table[i].id)
        // again swap all crepes from current to the bottom
        for (let j = 0; j < (table.length - k) / 2; j++) {
            let tmp = table[j]
            table[j] = table[table.length - 1 - j - k]
            table[table.length - 1 - j - k] = tmp
            // swap all sides
            table[j].side = (table[j].side === 0) ? 1 : 0
            if (j!==table.length - 1 - j - k) { // if it's not the same crepe
                table[table.length - 1 - j - k].side = (table[table.length - 1 - j - k].side === 0) ? 1 : 0
            }
        }
        // because it is now at the beginning we need to do it again
        max++; k--
    }
    k++; max--
    await delay(100)
    await solve(max, k)
}

function runRecursiveSolve() {
    chrono(false) // the timer is useless here since the game is solving itself
    number_of_flips = 0
    solve(highest_crepe, 0)
    won = false
    chrono(true)
}

function animate() {
    camera.updateMatrixWorld();
    controls.update(); update()
    light.position.copy(camera.position);
    renderer.render(window.scene, camera);
    requestAnimationFrame(animate);
        document.getElementById('flip-count').innerHTML = `Nombre de retournements: ${number_of_flips}`    

    
}

function showWin() {
  document.getElementById('screenWin').style.display = 'flex';
  restartCrepes()
}

document.getElementById('closescreenWin').addEventListener('click', () => {
    document.getElementById('screenWin').style.display = 'none';
    chrono(true)

})
function alertWon() {
    chrono(false)
    number_of_flips = 0
    solving = false
    showWin()
}

const helpModal = document.getElementById('helpModal');
const closeHelpModal = document.getElementById('closeHelpModal');
function showHelpModal() {
  helpModal.style.display = 'flex';
}

// Function to Hide the Help Modal
closeHelpModal.addEventListener('click',() => {
  helpModal.style.display = 'none';
})
