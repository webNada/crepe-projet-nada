<template>
    <Navbar class="fixed p-2 w-full bg-white" />
    <div class="flex justify-center py-14 w-screen h-screen overflow-y-scroll">
        <div class="">
            <p class="p-2 text-black-900 text-2xl">{{ language[store.current_language].game_rule_title }}</p>
            <p class="p-2 text-black-900 text-xl">{{ language[store.current_language].game_rule_description }}</p>
            <div class="flex flex-wrap">
                <img class="object-fill w-192 h-96 sm:w-128 sm:h-64 scale-75 hover:scale-100 transition-transform duration-300 p-2" src="../assets/crepes_examples.png" alt="exemple de crepes">
            </div>
            <p class="p-2 text-black-900 text-2xl">{{ language[store.current_language].how_to_play_title }}</p>
            <p class="p-2 text-black-900 text-xl">
                {{ language[store.current_language].how_to_play_description }}
            </p>
            <button @click="changeLanguage" class="rounded p-2 m-2 bg-gray-900 text-white font-bold text-xl">{{
            language[store.current_language].lang }}</button>
            <a class="p-2 py-4 text-blue-500 text-xl" href="https://portail.terra-numerica.org/res/rsrc/785"
                target="_blank">{{ language[store.current_language].link_text }}
            </a>
            <a href="#/game" class="rounded px-5 p-2 m-2 bg-blue-500 text-white font-bold">{{ language[store.current_language].play }}</a>
        </div>
    </div>
</template>

<script setup>
import Navbar from "../components/Navbar.vue";
import { language } from "../languages";
import { store } from '../store.js'

function changeLanguage() {
    if (store.current_language === "fr") {
        store.current_language = "eng"
    } else {
        store.current_language = "fr"
    }
}
</script>
