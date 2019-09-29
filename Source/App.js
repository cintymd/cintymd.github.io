(function () {
    "use strict";

    // Access token from cesium.com/ion/
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwOWE1YjQyYi1mNDVlLTQ3NTAtYWRhOC1kNDEwMTJlN2JhZGQiLCJpZCI6OTcyOCwic2NvcGVzIjpbImFzbCIsImFzciIsImFzdyIsImdjIl0sImlhdCI6MTU2MDk0NzA4Mn0.jMAyNQnXt6p8imNrPCSTYHi_-9eg6aTxYbiiFBWLipM';

    //////////////////////////////////////////////////////////////////////////
    // Creating the Viewer
    //////////////////////////////////////////////////////////////////////////


    var currentDate = Cesium.JulianDate.fromDate(new Date(2019, 7, 17));
    var newTime = Cesium.JulianDate.addHours(currentDate, 12, new Cesium.JulianDate());
    var clock = new Cesium.Clock({
        currentTime: newTime
    });

    var viewer = new Cesium.Viewer('cesiumContainer', {
        infoBox: false,
        selectionIndicator: false,
        shadows: false,
        shouldAnimate: true,
        clockViewModel: new Cesium.ClockViewModel(clock),
        navigationHelpButton: true,
        navigationInstructionsInitiallyVisible: true,
        scene3DOnly: true,
        homeButton: false,
    });



    //////////////////////////////////////////////////////////////////////////
    // Configuring the Scene
    //////////////////////////////////////////////////////////////////////////

    // // Create an initial camera view
    var initialPosition = new Cesium.Cartesian3.fromDegrees(13.72055556, 51.0215, 200);
    var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(25, -13, 0);
    var homeCameraView = {
        destination: initialPosition,
        orientation: {
            heading: initialOrientation.heading,
            pitch: initialOrientation.pitch,
            roll: initialOrientation.roll
        }
    };

    // // Set the initial view
    viewer.scene.camera.setView(homeCameraView);

    // // Enable lighting based on sun/moon positions
    viewer.scene.globe.enableLighting = true;


    //////////////////////////////////////////////////////////////////////////
    // Loading and Styling Entity Data
    //////////////////////////////////////////////////////////////////////////

    // //List of Geometries (function to read JSON file)
    function readTextFile(file, callback) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);
        rawFile.onreadystatechange = function () {
            if (rawFile.readyState === 4 && rawFile.status !== "200") {
                callback(rawFile.responseText);
                return rawFile.responseText;
            }
        }
        rawFile.send(null);
    }

    // //Read file and load geometries
    var buildingsPromise = Cesium.GeoJsonDataSource.load('./Source/data.geojson');

    function createModel(urlAspect, infoWireframe) {
        viewer.scene.primitives.removeAll();
        buildingsPromise.then(function (dataSource) {

            var buildingEntities = dataSource.entities.values;
            var scene = viewer.scene;
            for (var i = 0; i < buildingEntities.length; i++) {
                var entity = buildingEntities[i];
                //entity.label = undefined;
                entity.name = entity.properties.Name;
                var sourceFolder = './Source/Buildings/';
                var aspectFolder = urlAspect + '/';
                var buildingsNames = entity.properties.Name;
                var origin = entity.position._value;
                var urlBuilding = sourceFolder + aspectFolder + buildingsNames;
                var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)

                var gltfModel = new Cesium.Model.fromGltf({
                    name: undefined,
                    url: urlBuilding,
                    show: true,
                    modelMatrix: modelMatrix,
                    scale: 1.0,
                    debugWireframe: infoWireframe,
                    allowPicking: false,
                    debugShowBoundingVolume: false

                })

                var model = scene.primitives.add(gltfModel);

            }
            console.log(entity);
        });
    }

    var treesPromise = Cesium.GeoJsonDataSource.load('./Source/trees.geojson');
    var treesInstances = [];
    var treeCollection;

    function createTreeModel(showModel) {
        treesPromise.then(function (dataSource) {
            viewer.scene.primitives.remove(treeCollection);

            var treesEntities = dataSource.entities.values;
            var scene = viewer.scene;
            for (var i = 0; i < treesEntities.length; i++) {
                var entity = treesEntities[i];
                var sourceFolder = './Source/TreeModel.gltf';
                var origin = entity.position._value;
                var scale = Math.random() * (4.0 - 2.0) + 2.0;


                var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)
                Cesium.Matrix4.multiplyByUniformScale(modelMatrix, scale, modelMatrix);

                treesInstances.push({
                    modelMatrix: modelMatrix
                });

            }

            treeCollection = new Cesium.ModelInstanceCollection({
                url: sourceFolder,
                instances: treesInstances,
                show: showModel
            });

            var model = scene.primitives.add(treeCollection);

        });
    }

    var lightPromise = Cesium.GeoJsonDataSource.load('./Source/streetlamps.geojson');
    var lightInstances = [];
    var lightCollection;

    function createLightModel(showModel) {
        lightPromise.then(function (dataSource) {
            viewer.scene.primitives.remove(lightCollection);

            var lightEntities = dataSource.entities.values;
            var scene = viewer.scene;
            for (var i = 0; i < lightEntities.length - 1; i++) {
                var entity = lightEntities[i];
                var sourceFolder = './Source/streetlamp.gltf';
                var origin = entity.position._value;

                var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)
                Cesium.Matrix4.multiplyByUniformScale(modelMatrix, 150.0, modelMatrix);

                lightInstances.push({
                    modelMatrix: modelMatrix
                });

            }

            lightCollection = new Cesium.ModelInstanceCollection({
                url: sourceFolder,
                instances: lightInstances,
                show: showModel

            });

            var model = scene.primitives.add(lightCollection);

        });
    }

    // initial state
    createModel('None', false);
    createTreeModel(true);
    createLightModel(true);

    //////////////////////////////////////////////////////////////////////////
    // Adaptive viewer (change of textures)
    //////////////////////////////////////////////////////////////////////////


    // // Create all the base layers 
    var imageryLayers = viewer.imageryLayers;

    var viewModel = {
        layers: [],
        baseLayers: [],
        selectedLayer: null,
        isSelectableLayer: function (layer) {
            return this.baseLayers.indexOf(layer) >= 0;
        },
        silhouetteColor: 'Red',
        silhouetteAlpha: 1.0,
    };
    var baseLayers = viewModel.baseLayers;

    Cesium.knockout.track(viewModel);

    function setupLayers() {

        addBaseLayerOption(
            'None',
            undefined); // the current base layer
        addBaseLayerOption(
            'Artistic',
            Cesium.createOpenStreetMapImageryProvider({
                url: 'https://stamen-tiles.a.ssl.fastly.net/watercolor/',
                fileExtension: 'jpg',
                credit: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
            }));
        addBaseLayerOption(
            'Pencil',
            Cesium.createOpenStreetMapImageryProvider({
                url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/',
                fileExtension: 'jpg',
                credit: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
            }));
        addBaseLayerOption(
            'Contour',
            Cesium.createOpenStreetMapImageryProvider({
                url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/',
                fileExtension: 'jpg',
                credit: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
            }));
        addBaseLayerOption(
            'CNN',
            Cesium.createOpenStreetMapImageryProvider({
                url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/',
                fileExtension: 'jpg',
                credit: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
            }));

    }

    function addBaseLayerOption(name, imageryProvider) {
        var layer;
        if (typeof imageryProvider === 'undefined') {
            layer = imageryLayers.get(0);
            viewModel.selectedLayer = layer;
        } else {
            layer = new Cesium.ImageryLayer(imageryProvider);
        }

        layer.name = name;
        baseLayers.push(layer);
    }


    function updateLayerList() {
        var numLayers = imageryLayers.length;
        viewModel.layers.splice(0, viewModel.layers.length);
        for (var i = numLayers - 1; i >= 0; --i) {
            viewModel.layers.push(imageryLayers.get(i));
        }
    }

    setupLayers();
    updateLayerList();

    //Bind the viewModel to the DOM elements of the UI that call for it.
    var toolbar = document.getElementById('toolbar');
    Cesium.knockout.applyBindings(viewModel, toolbar);

    // // Define the Basemap according to the texture
    var textureFolder = 'none';
    var showTree = true;
    var showLights = true;
    Cesium.knockout.getObservable(viewModel, 'selectedLayer').subscribe(function (baseLayer) {
        // Handle changes to the drop-down base layer selector.
        var activeLayerIndex = 0;
        var numLayers = viewModel.layers.length;
        for (var i = 0; i < numLayers; ++i) {
            if (viewModel.isSelectableLayer(viewModel.layers[i])) {
                activeLayerIndex = i;
                break;
            }
        }
        var activeLayer = viewModel.layers[activeLayerIndex];
        var show = activeLayer.show;
        var alpha = activeLayer.alpha;
        imageryLayers.remove(activeLayer, false);
        imageryLayers.add(baseLayer, numLayers - activeLayerIndex - 1);
        baseLayer.show = show;
        baseLayer.alpha = alpha;
        updateLayerList();

        //Update aspect facades
        textureFolder = baseLayer.name;
        createModel(textureFolder);
        createTreeModel(showTree);
        createLightModel(showLights);
    });



    //////////////////////////////////////////////////////////////////////////
    // Clock interaction
    //////////////////////////////////////////////////////////////////////////

    //general info about the building 

    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;

    var hourPlusButton = document.getElementById('hourPlus');
    var hourMinusButton = document.getElementById('hourMinus');
    var timeLabel = document.getElementById('timeLabel');

    // The clock tick listener gets called every animation frame.
    // Keep it fast and try not to allocate any memory if possible.
    viewer.clock.onTick.addEventListener(function (clock) {
        var elapsed = Cesium.JulianDate.secondsDifference(
            clock.currentTime, clock.startTime);
        var hours = Math.floor(elapsed / 3600);
        elapsed -= (hours * 3600);
        var minutes = Math.floor(elapsed / 60);
        elapsed -= (minutes * 60);
    });

    // Button click callbacks are free to allocate memory.
    hourPlusButton.addEventListener('click', function () {
        viewer.clock.currentTime = Cesium.JulianDate.addSeconds(
            viewer.clock.currentTime, 3600, new Cesium.JulianDate());
    }, false);

    hourMinusButton.addEventListener('click', function () {
        viewer.clock.currentTime = Cesium.JulianDate.addSeconds(
            viewer.clock.currentTime, -3600, new Cesium.JulianDate());
    }, false);




    //////////////////////////////////////////////////////////////////////////
    // Setup Time Mode
    //////////////////////////////////////////////////////////////////////////

    var dayModeElement = document.getElementById('dayMode');
    var nightModeElement = document.getElementById('nightMode');

    // // Change the day time, from DAY to NIGHT mode
    function setTimeMode() {
        if (nightModeElement.checked) {
            var nightTime = Cesium.JulianDate.addHours(currentDate, 25, new Cesium.JulianDate());
            viewer.clockViewModel.currentTime = nightTime;
        } else {
            var dayTime = Cesium.JulianDate.addHours(currentDate, 12, new Cesium.JulianDate());
            viewer.clockViewModel.currentTime = dayTime;
        }
    }

    nightModeElement.addEventListener('change', setTimeMode);
    dayModeElement.addEventListener('change', setTimeMode);



    //////////////////////////////////////////////////////////////////////////
    // Setup Display of Additional Features
    //////////////////////////////////////////////////////////////////////////

    //Shadows
    var shadowsElement = document.getElementById('shadows');

    shadowsElement.addEventListener('change', function (e) {
        viewer.shadows = e.target.checked;
    });


    //Trees and Street lignts
    var treesElement = document.getElementById('trees');

    treesElement.addEventListener('change', function (e) {
        showTree = e.target.checked;
        createTreeModel(e.target.checked);

    });



    var lightsElement = document.getElementById('lights');

    lightsElement.addEventListener('change', function (e) {
        showLights = e.target.checked;
        createLightModel(e.target.checked);

    });

    //Wireframe
    var wireframeElement = document.getElementById('wireframe');

    wireframeElement.addEventListener('change', function (e) {

        createModel(textureFolder, e.target.checked);
        createTreeModel(showTree);
        createLightModel(showLights);

    });

}());
