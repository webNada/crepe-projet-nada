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


//Initialization of all state variables 
const info = ref(false)
const number_of_flips = ref(0)
const numbers_of_crepes = ref(4)
const lowest_crepe = ref(0)
const highest_crepe = ref(0)
const solving = ref(false)
const can_solve = ref(false)
// const flipping = ref(false)
// const score = ref(0)
const old_group_position_y = ref(0)
let clicked_id = undefined
let won = false
const clicked_restart = ref(false)


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

let crepes = []
let table = []
let restart_table = []

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
        // the next 17 lines can be removed if the framework is done and offers a support for the crepes
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
        }, undefined, function ( error ) {
            console.error( error );
        } );

        initCrepes()
            animate()
    } catch (error) {

    }
})

//The Fisher-Yates algorith https://dev.to/codebubb/how-to-shuffle-an-array-in-javascript-2ikj
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

    for (let i = 0; i < crepes.length; i++) {
        crepes[i].rotation.set(0, 0, 0)
    }

    shuffleArray(crepes)
    table = []
    let side = 0

    for (let i = crepes.length - 1; i >= 0; i--) {
        if (version.value === 1) {
            side =  Math.floor(Math.random() * 2)
        }
        table.push({ id: crepes[i].id, side: side})
    }   

    restart_table = []
    
    for (let i = crepes.length - 1, j = 0; i >= 0; i-- , j++) {
        crepes[i].position.y = 0.2 * i;
        restart_table.push({ id: crepes[i].id, y: crepes[i].position.y, side: table[i].side })

        if (table[j].side === 1) {
            crepes[j].rotation.x += (Math.PI / 2) * 2
        }
        table[j].side = restart_table[j].side
    }

    solving.value = false
    can_solve.value = true
}

function restartCrepes() {

    if (clicked_restart.value) return
    clicked_restart.value = true
    while (group.children.length) {
        scene.attach(group.children[0]);
    }

    table = []
    let ok = true
    let low = lowest_crepe.value
    for (let i = 0; i < restart_table.length; i++) {

        table[i] = {
            id: restart_table[i].id,
            side: restart_table[i].side
        }
        if (table[i].id !== low) {
            ok = false
        }
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

    can_solve.value = !ok;
    won = false
    solving.value = false
}


//initCrepes() Creates a list of crepes based on the variable 'number_of_crepes' then adds them to the Three.js scene.
//Depending on the parity of a crepe's position in the list and the game version, it does not have the same textures.
function initCrepes() {

    if (crepes.length > 0) {
        for (let i = 0; i < crepes.length; i++) {
            crepes[i].geometry.dispose()
            scene.remove(crepes[i])
        }
    }

    won = false
    number_of_flips.value = 0
    group.clear()
    restart_table = []
    table = []
    crepes = []

    // Initialization of crepe colors and textures
    let couleur = []    // Will be used to hold the textures of the different faces of the crepe represented by a cylinder

    // textures:
    let impair = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/crepetexture.png") });
    let impair_side = new THREE.MeshLambertMaterial( {color: 0xE5B88E});
    let pair = new THREE.MeshBasicMaterial({ map : load.load("dist/assets/textures/Oakcrepe.png") });
    let pair_side = new THREE.MeshLambertMaterial({color : 0x494134});
    let bottom

    if (version.value === 1 ){ bottom = new THREE.MeshLambertMaterial({color : 'black'}); }

    for (let i = numbers_of_crepes.value - 1; i >= 0; i--) {
        let geometry = new THREE.CylinderGeometry(1.2 - i / numbers_of_crepes.value, 1.2 - i / numbers_of_crepes.value, 0.18)

        // Depending on the parity of i and the version of the game, we give it the correct textures
        if (i % 2 == 1) { couleur = [impair_side, impair] }
        else { couleur = [pair_side, pair] }

        if (version.value === 1) { couleur.push(bottom) }
        else { couleur.push(couleur[1]) }

        // creation of the crepe and adding it in different arrays
        let disc = new THREE.Mesh( geometry, couleur );
        disc.position.y = 0.2 * i;
        table.push({ id: disc.id, side: 0 })
        restart_table.push({ id: disc.id, y: disc.position.y, side: 0 })
        crepes.push(disc);
        scene.add(disc)
    }

    lowest_crepe.value = table[0].id
    highest_crepe.value = table[table.length - 1].id

}

// editCrepe() is responsible for clearing the arrays of old crepes as well as the 3D scene.
// It increments or decrements the maximum number of crepes by n depending on the sign of n,
// then calls initCrepes() to recreate them with one additional crepe.
function editCrepe(n) {

    old_group_position_y.value = null
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
        while (group.children.length) {
            scene.attach(group.children[0]);
        }
        group.rotation.z = 0;
        group.position.y = 0;
        solving.value = true
        let y = intersection[0].object.position.y
        clicked_id = intersection[0].object.id

        group.position.y = (0.2 * (numbers_of_crepes.value - 1) + y) / 2;

        let i = 0
        while (i < crepes.length) {
            if (crepes[i].position.y >= y) {
                group.attach(crepes[i])
            }
            i++
        }

        old_group_position_y.value = group.position.y

        i = 0
        while (i < table.length) {
            if (table[i].id === clicked_id) {
                break
            }
            i++
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

        new Tween(group.position)
            .to({ y: group.position.y + 1 }, 300)
            .easing(Easing.Quadratic.Out)
            .chain(new Tween(group.position)
                .to({ y: old_group_position_y.value }, 300)
                .easing(Easing.Quadratic.In))
            .start();

        new Tween(group.rotation)
            .to({ z: Math.PI }, 600)
            .onComplete(() => {
                if (i!==0 || version.value===1) {
                    number_of_flips.value += 1
                }
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

                can_solve.value = !won;
                if (won && number_of_flips.value!==0) {
                    console.log(" victoire ")
                    alertWon()
                }
            })
            .start()
    }

}, false);

function handler(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', () => handler(), false); // revoir et definir limites au zoom/resize
window.addEventListener('zoom', () => handler(), false);


function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function solveAnimation(id) {
    while (group.children.length) {
        scene.attach(group.children[0]);
    }
    group.rotation.z = 0;
    group.position.y = 0;

    const object = scene.getObjectById(id);

    let y = object.position.y

    group.position.y = (0.2 * (numbers_of_crepes.value - 1) + y) / 2;

    let i = 0

    while (i < crepes.length) {
        if (crepes[i].position.y >= y) {
            group.attach(crepes[i])
        }
        i++
    }

    let old_y = group.position.y

    new Tween(group.position)
        .to({ y: group.position.y + 1.5 }, 100)
        .easing(Easing.Quadratic.Out)
        .chain(new Tween(group.position)

            .to({ y: old_y }, 100)
            .easing(Easing.Quadratic.In))
        .start();

    new Tween(group.rotation)
        .to({ z: Math.PI }, 200).start()
    id = -1
}

// This is the most difficult part of code
// To solve crepes i use recursion

// So you need to sort from lowest crepe at top to highest at bottom they are represent in array as [15, 16, 17, 18] 4 crepes
// The trick is to place the biggest crepe to top if it is not at it

// let's say if an array is [15, 17, 16, 18] when you flip the index 1 (17) you are flipping also all crepes above
// so it will be [17, 15, 16, 18] then you need to place it to index 2 (in place of 16) so you flip crepe 16
// it becomes [16, 15, 17, 18] and now you need to flip crepe at index 1 (15) to place it at beggining

// max crepe is starting at highest and each time it is decreasing say from 18 to 17 etc. also the end index k is incrementing by 1 in order to get the wanted position of the crepe
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
    // for black side version you just check color (table[x].side === 1)
    if (i === 0 && max === table[i].id && k === table.length - 1) {
        let ok = true
        if (version.value === 1) {
            for (let ii = 0; ii < table.length; ii++) {
                if (table[ii].side === 1) {
                    ok = false
                    ii = table.length
                }
            }
        } if (version.value === 1 && ok || version.value === 0) {
            console.log("done");
            clicked_restart.value = false
            can_solve.value = false
            solving.value = false
            return
        }
    }

    //when i is 0 means the crepe that we are looking for is at beginning of array
    if (i === 0) {
        // means that the crepe is the latest crepe there are no crepe left so the game is solved!
        if (k === table.length - 1) {
            // black side version you need to flip it
            if (version.value === 1) {
                    await solveAnimation(table[0].id)
                    await delay(600)
                if (table[0].side === 1) {
                    //    console.log(max, i, k, table, "flip the top");
                    table[i].side = (table[i].side === 0) ? 1 : 0
                }

            } else {

                let tmp = table[0]
                table[0] = table[1]
                table[1] = tmp

                table[0] = (table[0] === 1) ? 0 : 1
                table[1] = (table[1] === 1) ? 0 : 1
            }
            
                can_solve.value = false
                solving.value = false
                return

        } else {

            //crepe is at the beginning but there still are crepes that are next max crepes
            //white side crepe flip it to black side because when you going to flip where it position has to be, it will be flipped correctly(black side down)
            if (version.value === 1 && table[i].side === 0) {
                await solveAnimation(table[0].id)
                await delay(600)
                table[0].side = 1
            }

            //swap all positions in an array till the current end index (k)
            for (let j = 0; j < (table.length - k) / 2; j++) {
                let tmp = table[j]
                table[j] = table[table.length - 1 - j - k]
                table[table.length - 1 - j - k] = tmp
            }
            await solveAnimation(table[i].id)
            await delay(600)
            //swap black side to white side and vice versa
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
        await delay(600)
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
            await delay(600) // if you reduce it, the next animation might start before the first one is finished
            // again swap all crepes from current to the beginning
            for (let j = 0; j < (table.length - k) / 2; j++) {

                let tmp = table[j]
                table[j] = table[table.length - 1 - j - k]

                table[table.length - 1 - j - k] = tmp

            }
            // swap all sides
            for (let j = 0; j < (table.length - k); j++) {
                    table[j].side = (table[j].side === 0) ? 1 : 0
            }

            // because it is now at the beginning we need to redo for it
            max += 1
            k--
    }
    k++
    max -= 1
    await delay(100)
    await solve(max, k)
}

function runRecursiveSolve() {
    number_of_flips.value = 0
    solve(highest_crepe.value, 0)
}

function animate() {
    camera.updateMatrixWorld();
    controls.update();
    update()
    light.position.copy(camera.position);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function alertInfo() {
    if (info.value) {
    document.getElementById("alertInfo").classList = "absolute -z-10 opacity-0"
    } else {
        document.getElementById("alertInfo").classList = "absolute z-40 lg:flex-col lg:w-1/3 lg:left-1/3 lg:top-1/4 sm:left-0 md:left-0 sm:h-full opacity-100 bg-white"
    }
    info.value = !info.value
}

function alertWon() {
    toggleConfetti()
    solving.value = true
    document.getElementById("winInfo").classList = "absolute flex justify-center items-center text-center z-40 w-full top-1/4 opacity-100"
    setTimeout(() => {
        number_of_flips.value = 0
        document.getElementById("winInfo").classList = "absolute -z-10 opacity-0"
        solving.value = false
    }, 4000);
}

// State variables
const confettiVisible = ref(false);
const confettiKey = ref(0); // Initial key value

// Method to toggle confetti and update animation properties
const toggleConfetti = () => {
    confettiVisible.value = !confettiVisible.value;
    confettiKey.value++; // Increment the key to trigger animation
};
</script>
<template>
    <Navbar class="absolute p-2" />
    <div id="alertInfo" class="absolute -z-10 opacity-0">
        <div class=" bg-blue-500 text-white font-bold text-xl p-2" > Info </div>
        <div class="flex-col">
            <p class="p-2 text-black-900 text-2xl">{{ language[store.current_language].game_rule_title }}</p>
            <p class="p-2 text-black-900 text-xl">{{ language[store.current_language].game_rule_description }}</p>
            <p class="p-2 text-black-900 text-2xl">{{ language[store.current_language].how_to_play_title }}</p>
            <p class="p-2 text-black-900 text-xl">{{ language[store.current_language].how_to_play_description }}</p>
            <a class="float-left p-2 py-4 text-blue-500 text-xl" href="https://portail.terra-numerica.org/res/rsrc/785" target="_blank">
                {{ language[store.current_language].link_text }}
            </a>
            <button @click="alertInfo" class="rounded float-right px-5 p-2 m-2 bg-blue-500 text-white font-bold">
                OK
            </button>
        </div>
    </div>

    <div id="winInfo" class="absolute -z-10 opacity-0">
        <!-- Confetti animation code  -->
        <!-- https://codepen.io/amardeeprai/pen/YzNLEav -->
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
        <!-- <span class="p-2 m-2 text-black font-bold text-xl">{{ language[store.current_language].score }}: {{ score }}</span> -->
        <button v-bind:disabled="won || solving || !can_solve"  class="flex justify-end rounded p-2 m-2 bg-blue-500 text-black font-bold text-xl" @click.prevent="runRecursiveSolve">
            {{ language[store.current_language].solve }}
        </button>
        <a href="#" class="rounded px-5 p-2 m-2 bg-amber-400 text-black font-bold text-xl">{{ language[store.current_language].back }}</a>
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
    }

    body {
      margin: 0;
      padding: 0;
      position: fixed;
      top: 0;
      left: 0;
    }

</style>