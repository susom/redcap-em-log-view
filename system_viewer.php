<?php

namespace Stanford\LogViewerModule;

// Include the LogView class
//include_once("classes/LogView.php");

$thisModule = new \Stanford\LogViewerModule\LogViewerModule();



//$logViewerModule = new \Stanford\LogViewerModule();

// This is a copy of a terrible plugin trying to convert it into a module...

// Determine which files to view
$thisModule->loadSystemPaths();

// Handle any ajax callbacks
$thisModule->handleAjax();

$thisModule->renderViewers();

