<script setup>
//In order to work with this project you need some reasoning skills, a good understanding of javascript and the basics of Three.js and Vue.js
//Flip animation taken from and modified for my needs
//https://codepen.io/boytchev/pen/wvQRERM?editors=1010

import Confetti from "../components/Confetti.vue";
import Navbar from "../components/Navbar.vue";
import { ref, onMounted } from 'vue'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Tween, Easing, update } from "three/addons/libs/tween.module.js"
import * as THREE from "three";
import { language } from "../languages";
import { store } from '../store.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = ref(null)
const version = ref(0)
// version 0 is the classic game and version 1 is the one that adds a black side on each crepe
// and where these black sides all have to be down in order to win  

function changeLanguage() {
    if (store.current_language === "fr") {
        store.current_language = "eng"
    } else {
        store.current_language = "fr"
    }
}


//State variables 
const info = ref(false)
const number_of_flips = ref(0)
const numbers_of_crepes = ref(4)
const lowest_crepe = ref(0)
const highest_crepe = ref(0)
const solving = ref(false) // is used to disable the buttons during the animation
let won = false // is used to check if the game is over
let sec = 0
var timer = 0

function chrono(bool){ // if true we run the timer else we stop it
    let safeTimerDisplay = document.getElementById('safeTimerDisplay')
    if (timer!==0) {
        clearInterval(timer);
        sec=0
    }
    if (!bool) { 
        safeTimerDisplay.innerHTML = '00:00'
        return
    }
    timer = setInterval( function(){
        sec++;
        if (sec > 600) { clearInterval(timer);}
        safeTimerDisplay.innerHTML = ((sec/60<10)? '0' : '') + Math.floor(sec/60) + ':' + ((sec%60<10)? '0' : '') + sec%60;
    }, 1000);
}

// Three.js Parameters
let raycaster= new THREE.Raycaster();
let light;
let scene;
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
const pair = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/Oakcrepe.png") });
const pair_side = new THREE.MeshLambertMaterial({ color : 0x494134 });
const impair = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/crepetexture.png") });
const impair_side = new THREE.MeshLambertMaterial( { color: 0xE5B88E });

const pair_bottom = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/Oakcrepe_back.png") });
const impair_bottom = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/crepetexture_back.png") });

let couleur_pair = [pair_side, pair, pair]
let couleur_impair = [impair_side, impair, impair]


onMounted(() => {
    try {
          //////////////////////////////
         // Creation of the 3D scene //
        //////////////////////////////

        scene = new THREE.Scene()
        scene.background = new THREE.Color('gainsboro');
        let ambientLight = new THREE.AmbientLight('beige', 0.5);
        light = new THREE.DirectionalLight('white', 1);
        light.position.set(1, 1, 1);
        scene.add(light)
        scene.add(group)
        
        scene.add(ambientLight);
        renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight);
        camera.position.set(0, 2, 10);
        camera.lookAt(scene.position);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.minDistance = 5;
        controls.maxDistance = 35; 

        controls.enableDamping = true;

        
          ////////////////////////////////////////////////
         // Creation of the area underneath the crepes //
        ////////////////////////////////////////////////

        // Source of the textures: Terra Numerica and freepik.com 
        // Editing realised by myself
        // the next 17 lines can be removed once the framework is done and offers a "support" for the crepes
        const geometry = new THREE.BoxGeometry( 15, 10, 8 );
        let top = new THREE.MeshBasicMaterial({ map: load.load("dist/assets/textures/top.jpg") }); // texture of the upper side of the box
        let material = new THREE.MeshBasicMaterial({ map: load.load("dist/assets/textures/boxtexture.png") }); // the rest of the box

        var object = new THREE.Mesh(
            new THREE.BoxGeometry( 15, 10, 8 ),
            [
                material,   // right side
                material,   // left side
                top,        // top side
                material,   // bottom side
                material,   // front side
                material,   // back side
            ]
        );
        object.position.y = - 5.2;
        scene.add( object );

        let loader = new GLTFLoader();
        // source of the white plate: https://sketchfab.com/3d-models/white-ceramic-plate-4036111d2c5c47bab2320202d5e9a2a4
        loader.load( "dist/assets/white_ceramic_plate/scene.gltf", function ( gltf ) {
            gltf.scene.scale.set(12 * gltf.scene.scale.x, 12 * gltf.scene.scale.y, 12 * gltf.scene.scale.z)
            gltf.scene.position.y = -0.1;
            scene.add( gltf.scene );
        }, undefined, function ( error ) { console.error( error ); } );

        initCrepes(); animate();
    } catch (error) {}
})

//The Fisher-Yates algorithm https://dev.to/codebubb/how-to-shuffle-an-array-in-javascript-2ikj
const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function randomCrepe() {
    number_of_flips.value = 0
    solving.value = true
    while (group.children.length) {
        scene.attach(group.children[0]);
    }

    shuffleArray(crepes)
    table = []
    restart_table = []
    let side

    for (let i = crepes.length - 1; i >= 0; i--) {
        side = Math.floor(Math.random() * (version.value + 1))  // will be equal to 0 or 1
        table.push({ id: crepes[i].id, side: side}) // 0 is white side and 1 is black side
        crepes[i].rotation.set((Math.PI) * side, 0, 0) // if side is 1 then it is 180 degrees else 0
        crepes[i].position.y = 0.2 * i;
        restart_table.push({ id: crepes[i].id, y: crepes[i].position.y, side: side })
    }
    solving.value = false
    chrono(true)
}

function restartCrepes() {
    while (group.children.length) {
        scene.attach(group.children[0]);
    }

    table = []
    let low = lowest_crepe.value
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

    number_of_flips.value = 0
    won = false
    solving.value = false
    chrono(true)
}

//initCrepes() Creates a list of crepes based on the variable 'number_of_crepes' then adds them to the Three.js scene.
//Depending on the parity of a crepe's position in the list and the game version, its textures will differ.
function initCrepes() {
    for (let i = 0; i < crepes.length; i++) {
        crepes[i].geometry.dispose()
        scene.remove(crepes[i])
    }

    won = false
    number_of_flips.value = 0
    group.clear()
    restart_table = []
    table = []
    crepes = []

    // Depending on the the version of the game, we give it the correct textures
    if (version.value === 1) {
        couleur_pair[2] = pair_bottom
        couleur_impair[2] = impair_bottom
    }

    for (let i = numbers_of_crepes.value - 1; i >= 0; i--) {
        let geometry = new THREE.CylinderGeometry(1.2 - i / numbers_of_crepes.value, 1.2 - i / numbers_of_crepes.value, 0.18)
        // creation of the crepe and adding it in different arrays
        let disc
        if (i % 2 === 0) { disc = new THREE.Mesh(geometry, couleur_pair) }
        else { disc = new THREE.Mesh(geometry, couleur_impair) }
         
        disc.position.y = 0.2 * i;
        table.push({ id: disc.id, side: 0 })
        restart_table.push({ id: disc.id, y: disc.position.y, side: 0 })
        crepes.push(disc);
        scene.add(disc)
    }

    lowest_crepe.value = table[0].id
    highest_crepe.value = table[table.length - 1].id
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
        scene.remove(crepes[i])
    }

    table = []
    crepes = []
    crepes.length = 0
    highest_crepe.value += n
    numbers_of_crepes.value += n
    initCrepes()
}

document.addEventListener('mousedown', (event) => {

    if (event.detail === 2 && !solving.value && !info.value) {
        pointer.x = ((event.clientX / window.innerWidth) * 2 - 1);
        pointer.y = (-(event.clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersection = raycaster.intersectObjects(crepes);

        if (!(intersection.length > 0 && intersection[0].object.type === "Mesh")) return
        while (group.children.length) { scene.attach(group.children[0]); }

        group.rotation.z = 0;
        group.position.y = 0;
        solving.value = true
        let y = intersection[0].object.position.y
        group.position.y = (0.2 * (numbers_of_crepes.value - 1) + y) / 2;

        let i = 0

        for (let j = 0; j < crepes.length; j++) {
            if (crepes[j].position.y >= y) { group.attach(crepes[j]) }
            if (table[j].id === intersection[0].object.id && i == j-1) { i = j }            
        }

        if (version.value === 1) {
            if (i === 0) {
                table[0].side = (table[0].side === 0) ? 1 : 0
            } else {
                for (let j = 0; j < i + 1; j++) {
                    table[j].side = (table[j].side === 0) ? 1 : 0
                }
            }
        }

        for (let j = 0; j < i / 2; j++) {
            let tmp = table[j]
            table[j] = table[i - j]
            table[i - j] = tmp
        }

        flip(group, 300)
        new Tween(group.rotation)
            .to({ z: Math.PI }, 600)
            .onComplete(() => {
                if (i!==0 || version.value===1) { number_of_flips.value++ }
                solving.value = false
                let low = lowest_crepe.value
                let k = 0
                won = true

                while (k < table.length) {
                    if (table[k].id !== low) {
                        won = false
                        break
                    }
                    k++
                    low++
                }
                if (version.value === 1) {
                    for (let ii = 0; ii < table.length; ii++) {
                        if (table[ii].side !== 0) {
                            won = false
                            ii = table.length
                        }
                    }
                }
                if (won && number_of_flips.value!==0) {
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
        .to({ y: group.position.y + 1 }, duration)
        .easing(Easing.Quadratic.Out)
        .chain(
            new Tween(group.position)
            .to({ y: group.position.y }, duration)
            .easing(Easing.Quadratic.In))
        .start();
}

async function solveAnimation(id) {
    while (group.children.length) { scene.attach(group.children[0]); }
    group.rotation.z = 0;
    group.position.y = 0;

    const object = scene.getObjectById(id);
    let y = object.position.y
    group.position.y = (0.2 * (numbers_of_crepes.value - 1) + y) / 2;

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
    solving.value = true
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
        if (version.value === 1) {
            for (let ii = 0; ii < table.length; ii++) {
                if (table[ii].side === 1) {
                    won = false
                    ii = table.length
                }
            }
        }
        if (version.value === 1 && won || version.value === 0) {
            solving.value = false
            return
        }
    }
    // when i = 0, it means that the crepe that we are looking for is at the beginning of the array
    if (i === 0) { 
        if (k === table.length - 1) { // means that no more crepe to sort so the game is over!
            // black side version you need to flip it
            if (version.value === 1) {
                await solveAnimation(table[0].id)
                if (table[0].side === 1) {
                    table[i].side = (table[i].side === 0) ? 1 : 0
                }
            } else {
                let tmp = (table[0] === 1) ? 0 : 1
                table[0] = (table[1] === 1) ? 0 : 1
                table[1] = tmp
            }
            solving.value = false
            return
        } else {
            //there still are crepes that need to be sorted
            if (version.value === 1 && table[i].side === 0) {
                //we have to put the black side upwards so that it'll face downwards when sorted
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
            if (version.value === 1) {
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
        if (version.value === 1) {
            for (let j = 0; j < i + 1; j++) {
                table[j].side = (table[j].side === 0) ? 1 : 0
            }
        }

        // because it is now at the beginning we need to redo for it
        max += 1
        k--
    }

    //special case for black side crepe if it is at it position you need to flip to the beginning else continue
    else if (i === table.length - 1 - k && version.value === 1 && table[i].side === 1) {
        await solveAnimation(table[i].id)
        // again swap all crepes from current to the bottom
        for (let j = 0; j < (table.length - k) / 2; j++) {
            let tmp = table[j]
            table[j] = table[table.length - 1 - j - k]
            table[table.length - 1 - j - k] = tmp
            // swap all sides
                table[j].side = (table[j].side === 0) ? 1 : 0
            if (j!==table.length - 1 - j - k) { // if it' i's not the same crepe
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
    number_of_flips.value = 0
    solve(highest_crepe.value, 0)
    won = false
    chrono(true)
}

function animate() {
    camera.updateMatrixWorld();
    controls.update(); update()
    light.position.copy(camera.position);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function alertInfo() {
    chrono(info.value)
    if (info.value) {
        document.getElementById("alertInfo").classList = "absolute -z-10 opacity-0"
    } else {
        document.getElementById("alertInfo").classList = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[80vh] w-[50%] bg-white rounded-lg shadow-lg p-4 overflow-y-auto"
    }
    info.value = !info.value
}

function alertWon() {
    chrono(false)
    toggleConfetti()
    solving.value = true
    document.getElementById("winInfo").classList = "absolute flex justify-center items-center text-center z-40 w-full top-1/4 opacity-100"
    setTimeout(() => {
        number_of_flips.value = 0
        document.getElementById("winInfo").classList = "absolute -z-10 opacity-0"
        solving.value = false
        chrono(true)
    }, 4000);
}

// Method to toggle confetti and update the animation properties

const confettiVisible = ref(false);
const confettiKey = ref(0); // Initial key value
const toggleConfetti = () => {
    confettiVisible.value = !confettiVisible.value;
    confettiKey.value++; // Increment the key to trigger animation
};
</script>
<template>
    <Navbar class="absolute p-2" />
    <div id="alertInfo" class="absolute -z-10 opacity-0">
    <div class="bg-blue-500 text-white font-bold text-xl p-2 text-center">Info</div>
    <div class="flex-col">
        <p class="p-2 text-black-900 text-2xl text-center">{{ language[store.current_language].game_rule_title }}</p>
        <p class="p-2 text-black-900 text-xl">{{ language[store.current_language].game_rule_description }}</p>
        <p class="p-2 text-black-900 text-2xl text-center">{{ language[store.current_language].how_to_play_title }}</p>
        <p class="p-2 text-black-900 text-xl">{{ language[store.current_language].how_to_play_description }}</p>
        <a class="p-2 py-4 text-blue-500 text-xl block" href="https://portail.terra-numerica.org/res/rsrc/785"
            target="_blank">{{ language[store.current_language].link_text }}
        </a>
        <div class="flex justify-center items-center h-full">
            <button @click="alertInfo" class="rounded px-5 p-2 m-2 bg-blue-500 text-white font-bold" >OK</button>
        </div>
    </div>
    </div>

    <div id="winInfo" class="absolute -z-10 opacity-0">
        <!-- Confetti animation code: https://codepen.io/amardeeprai/pen/YzNLEav -->
        <div class="confetti">
            <div class="confetti__wrapper">
                <span v-for="n in 51">
                    <Confetti :class="'confetti-left-' + (n - 1)"
                        :key="confettiKey" />
                    <Confetti :class="'confetti-right-' + (n - 1)"
                        :key="confettiKey" />
                </span>
            </div>
        </div>
        <p class="bg-white p-2 text-xl w-auto h-auto">{{ language[store.current_language].winMessage }}</p>
    </div>

    <div id="actions_group" class="absolute z-10 flex flex-wrap w-full justify-center items-center bottom-0">
        <button @click="changeLanguage" class="rounded p-2 m-2 bg-gray-900 text-white font-bold text-xl">
            {{ language[store.current_language].lang }}
        </button>
        <button v-bind:disabled="solving" @click="alertInfo" class="rounded p-2 m-2 bg-gray-900 text-white font-bold">
            Info
        </button>
        <button v-bind:disabled="solving" @click="() => { (version === 0 ? version = 1 : version = 0), initCrepes() }" class="rounded p-2 px-4 m-2 bg-gray-900 text-white font-bold">
            Version {{ version }}
        </button>
        <button v-bind:disabled="solving" class="rounded p-2 m-2 bg-amber-400 text-black font-bold text-xl" @click.prevent="randomCrepe">
            {{ language[store.current_language].randomize }}
        </button>
        <button v-bind:disabled="solving || !(numbers_of_crepes > 4)" class="rounded-l p-2 m-2 bg-blue-500 text-white font-bold text-xl" @click.prevent="editCrepe(-1)">
            -
        </button>
        <span class="rounded-none p-2 text-black font-bold text-xl">
            {{ numbers_of_crepes }}
        </span>
        <button v-bind:disabled="solving || !(numbers_of_crepes < 20)" class="rounded-r p-2 m-2 bg-blue-500 text-white font-bold text-xl" @click.prevent="editCrepe(1)">
            +
        </button>
        <button v-bind:disabled="solving" class="rounded p-2 m-2 bg-teal-600 text-white font-bold text-xl" @click.prevent="restartCrepes">
            {{ language[store.current_language].restart }}
        </button>
        <span class="p-2 m-2 text-black font-bold text-xl">
            {{ language[store.current_language].flips_text }}: {{ number_of_flips }}
        </span>
        <button v-bind:disabled="won || solving"  class="flex justify-end rounded p-2 m-2 bg-blue-500 text-black font-bold text-xl" @click.prevent="runRecursiveSolve">
            {{ language[store.current_language].solve }}
        </button>
        <a href="#" id ="stop_timer" class="rounded px-5 p-2 m-2 bg-amber-400 text-black font-bold text-xl">{{ language[store.current_language].back }}</a>
        <div id="safeTimer">
            {{ language[store.current_language].timer }}
            <p id="safeTimerDisplay">00:00</p>
        </div>
    </div>
    <canvas class="z-0" ref="canvas"></canvas>
</template>
<style setup>
    html,
    body {
      overscroll-behavior-x: none;
      overscroll-behavior-y: none;
      -webkit-user-select: none;
      -ms-user-select: none;
      user-select: none;
      margin: 0;
      padding: 0;
      position: fixed;
      top: 0;
      left: 0;
    }
</style>