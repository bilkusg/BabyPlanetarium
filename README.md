# babyplanetarium by greenwheel
> A Babylon.js application designed for the Oculus Quest but easily modifiable for other platforms, 
which attempts to display the sky with reasonable accuracy.  

## Usage
Just configure your web server to serve from the top directory  and then point your browser accordingly

When you start the program it allows you to configure various parameters which control the resulting view of the sky. Then when you enter, the VR app is displayed. Clicking on the logo at the bottom right will put you into full VR mode if your hardware supports this.

### Oculus Quest controls
When you launch the main app, you will see a view of the sky with a rather boring black ground. There is a control panel to the north which can be controlled by pointing the laser beam on the right hand controller and pressing the trigger. You can also control things using the xy and ab buttons, and the thumb controllers on each hand. 

The buttons work as follows:

- x: toggle whether the ground and daylight are visible. ( Not visible means you can see the entire sky, including the bit normally beneath your feet and with no atmospheric
   effects during daytime, so the sun is just a large circle.  Like being in space. )
- y: toggle whether  the keyboard and display info at cardinal points is visible.
- a: increase the rate at which time flows 
- b: decrease the rate at which time flows

- left thumb l-r change longitude
- left thumb u-d change latitude

- right thumb u-d change the size of the moon. The moon is quite hard to see clearly if drawn at the
correct size, and making it bigger lets you see it as though through a telescope.

- right thumb l-r change system time. By default this happens in units of a sidereal day, so the stars don't move but the planets and moons do.

The control panel is customised with labels which tell you what each key does. You press a key by raycasting and hitting the trigger.

## raycasting
If you point at a star and hit the trigger on the right hand controller, the display in the west
will show the name, constellation, magnitude, ra and dec of the star. 
As mentioned above, the raycaster also allows use of the control panel in the North.

## Release History
This is the second publicly released version v5.0 dated October 2019
  
## License
Distributed under the MIT license. 

## Understanding the code
One of the main purposes of writing this application was to become familiar with a-frame at a more than superficial level. As a result, I have documented the code rather more
assiduously than I might have otherwise done, in the hope that this makes it easy for others ( or myself in future ) to learn from it. 

If you want to dive in, you should know the following
- index.html just creates a form to set up various useful initial parameters before launching the main application
- sky.html is the main html entry point for the app - loads scripts and a placeholder for the scene, as well as setting up the 'enter VR' button, which needs a bit of css.
- babylife.js defines a lifecycle for parts of the view. It makes it easy
  to add components to an existing application 
- babysky.js is the main javascript file which sets up the defaults, creates components, loads the scene and runs things.
- scene.html is the definition of the a-frame scene. It is dynamically loaded by sky.js to ensure it doesn't inititalise the dom before all our components are registered.
- astro.js is a set of useful astronomical functions
- vendor is a directory containing various third-party libraries for which there was no convenient online repo
- vendor/aframe-control-panel is one of mine

## Acknowledgements
This open-source project is dependent on a number of other open-source projects and resources. In particular:
- babylon.js
- orb2 for astronomical calculations http://www.lizard-tail.com/isana/lab/orbjs/
- the hyg database of stars  http://www.astronexus.com/hyg - I converted the supplied csv file to javascript
- [http://coryg89.github.io/MoonDemo] by coryg89 from which I got the moon images &c.
- https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color pointed me at blackbody colour calculations
