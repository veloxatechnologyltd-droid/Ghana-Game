import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';

window.THREE = {...THREE, RoomEnvironment, mergeGeometries, FBXLoader, cloneSkeleton};
