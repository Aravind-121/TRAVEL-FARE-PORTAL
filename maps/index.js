function initMap() {
	const map = new google.maps.Map(document.getElementById('map'),{
		center: {
			lat: 12.9249,
			lng: 80.1
		},
		zoom: 15
	});
	new AutocompleteDirectionsHandler(map);
}

class AutocompleteDirectionsHandler {
	constructor(map) {
		this.map = map;
		this.originPlaceId = '';
		this.destinationPlaceId = '';
		this.responseObject={}; 
		this.priceAndDistanceArray=[];
		this.directionsService = new google.maps.DirectionsService();
		this.directionsRenderer = new google.maps.DirectionsRenderer();
		this.geocoder= new google.maps.Geocoder; 
		this.directionsRenderer.setMap(map);
		this.distanceDisplay = document.getElementById('dist-display');
		const originInput = document.getElementById('origin-input');
		const destinationInput = document.getElementById('destination-input');
		const currentLocation = document.getElementById('current-location');
		
		//getting the current location 
		currentLocation.addEventListener('click',()=>{
			if (navigator.geolocation) {
			    navigator.geolocation.getCurrentPosition(
			      (position) => {
				    const pos ={lat: position.coords.latitude, lng: position.coords.longitude};
			        this.geocoder.geocode( {'location': pos},(res,status)=>{
			        	if (status=="OK"){
				        	if (res[1]){
				        		originInput.value="Your location";
								this.originPlaceId=res[1].place_id;
								this.route();
								
				        	}else{
				        		console.log('error'); 
				        	}
				        }else{
				        	console.log(status);
				        }
			        })
			  });
		 	}
		})

		//autocomplete code 
		const originAutocomplete = new google.maps.places.Autocomplete(originInput);
		originAutocomplete.setFields([ 'place_id' ]);
		const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
		destinationAutocomplete.setFields([ 'place_id' ]);

		this.setupPlaceChangedListener(originAutocomplete, 'O');
		this.setupPlaceChangedListener(destinationAutocomplete, 'D');
	}

	setupPlaceChangedListener(autocomplete, mode) {
		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (!place.place_id) {
				window.alert('Please select an option from the dropdown list :-(');
				return;
			}

			if (mode === 'O') {
				this.originPlaceId = place.place_id;
			} else {
				this.destinationPlaceId = place.place_id;
			}
			//call the function to request 
			this.route();
		});
	}
	//request for more details;
	displayDetails(){
		const modaltilte=document.getElementById('exampleModalLabel');
		for (let mode of ['Taxi','Auto','Bike']){
			const btn= document.getElementById(`${mode}modal`); 
			btn.addEventListener('click', ()=>{
				modaltilte.innerHTML=mode;
				let service = new google.maps.DistanceMatrixService();
				service.getDistanceMatrix(
				{
					origins: [ {placeId: this.originPlaceId}],
					destinations: [ {placeId: this.destinationPlaceId}],
					travelMode: 'DRIVING',
					avoidHighways: false,
					avoidTolls: false,
					drivingOptions: {
						departureTime: new Date(Date.now()),
						trafficModel: 'bestguess'
					}
				},
				(response,status)=>{
					if (status=="OK"){
						let element = response.rows[0].elements[0];
						console.log(element);
						document.getElementById('bestguess').textContent= element.duration.text; 
						document.getElementById('bestguesstraffic').textContent= element.duration_in_traffic.text; 
					}
				}
				);
				service.getDistanceMatrix(
				{
					origins: [ {placeId: this.originPlaceId}],
					destinations: [ {placeId: this.destinationPlaceId}],
					travelMode: 'DRIVING',
					avoidHighways: false,
					avoidTolls: false,
					drivingOptions: {
						departureTime: new Date(Date.now()),
						trafficModel: 'pessimistic'
					}
				},
				(response,status)=>{
					if (status=="OK"){
						let element = response.rows[0].elements[0];
						document.getElementById('pessimistic').textContent= element.duration.text;
						document.getElementById('pessimistictraffic').textContent= element.duration_in_traffic.text;  
					}
				}
				);
		
				service.getDistanceMatrix(
				{
					origins: [ {placeId: this.originPlaceId}],
					destinations: [ {placeId: this.destinationPlaceId}],
					travelMode: 'DRIVING',
					avoidHighways: false,
					avoidTolls: false,
					drivingOptions: {
						departureTime: new Date(Date.now()),
						trafficModel: 'optimistic'
					}
				},
				(response,status)=>{
					if (status=="OK"){
						let element = response.rows[0].elements[0];
			
						document.getElementById('optimistic').textContent= element.duration.text; 
						document.getElementById('optimistictraffic').textContent= element.duration_in_traffic.text; 
					}
				}
				);
			})
		}
	}

	// for calculating the price  taxi,auto,bike
	calculatePrice(distance,mode){
		const CPP=84.15; //current petrol price 
		const AVG=84.5; //avg petrol price
		const PPK={
			Auto:9.5, 
			Taxi:13.2,
		}//price per km 
		if (mode!=='Bike')
			return  parseInt((distance* PPK[mode]* CPP)/AVG);
		if (distance<=10)
			return parseInt(((distance* PPK['Taxi']* CPP)/AVG)/3);
		else 
			return parseInt(((distance* PPK['Taxi']* CPP)/AVG)*3/5); 
	}
	//approximation function 
	displayDistanceAndPrice(mode,distance,duration){
		const icon={
			Taxi : 'fas fa-car-side',
			Auto : 'fas fa-shuttle-van',
			Bike : 'fas fa-motorcycle'
		}
		const fare=this.calculatePrice(parseFloat(distance.text.replace('kms','').replace('km','').replace(',','')),mode); 
		let timeintext=duration.text.replace('mins','m').replace('hours','h').replace('hour','h');
		let timeinsecs=duration.value;
		this.priceAndDistanceArray.push({mode,fare,timeinsecs,timeintext});
		this.distanceDisplay.textContent=distance.text;
		document.getElementById(mode).innerHTML=`
		<div class="name-icon">
			<h2>${mode}</h2>
			<i id="${mode}map" class='${icon[mode]}' aria-hidden="true" style='font-size:20px'></i>
		</div>
        <div class="price-time-container">
            <h3><span style="color:#ff66ff;">Duration </span>${timeintext}</h3>
			<h3><span style="color:#ff66ff;">Price </span>&#8377 ${fare}</h3>
			<button type="button" id="${mode}modal"class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#exampleModal">Info</button>
		</div>`
	}


	setupclickedeventListener(){
		//map display for each mode 
		const array=['Taximap','Automap','Bikemap','Busmap','Walkmap'].map(element => document.getElementById(element)); 
		array.forEach((ele)=>{
			ele.addEventListener('click',(e)=>{
				if (this.responseObject[e.target.id]){
					this.directionsRenderer.setDirections(this.responseObject[e.target.id]);
				} 
			})
		});

		//suggestion logic 
		document.getElementById('suggestionbtn').addEventListener('click',()=>{
			const suggestionbox=document.getElementById('suggestionbox'); 
			suggestionbox.innerHTML='';
			let num= parseInt(prompt('Please Enter the number of passengers :-'));
			//cost efficicent 
			let h2= document.createElement('h2');
			h2.innerHTML="For Economic travel, We suggest you to use"; 
			suggestionbox.appendChild(h2);
			for (let ele of  this.priceAndDistanceArray){
				if (ele.mode==='Bus'){
					ele.fare= ele.fare*num;  
				}
				if (ele.mode==='Bike'){
					ele.fare= ele.fare* Math.ceil(num/2); 
				}
				if (ele.mode==='Auto'){
					ele.fare= ele.fare *Math.ceil(num/3);  
				}
				if (ele.mode==='Taxi'){
					ele.fare= ele.fare *Math.ceil(num/6);
				}
			}
			this.priceAndDistanceArray.sort( (a,b) => a.fare - b.fare ); 
			console.log(this.priceAndDistanceArray);
			let ol= document.createElement('ol'); 
			for (let ele of  this.priceAndDistanceArray){
				let li=document.createElement('li');
				li.innerHTML=`<h5> ${ele.mode} mode of transportation. Cost: &#x20B9 ${ele.fare}</h5>`; 
				ol.appendChild(li);
			}
			suggestionbox.appendChild(ol); 
			//time efficient 
			h2= document.createElement('h2');
			h2.innerHTML="For Time Saving travel, We suggest you to use"; 
			suggestionbox.appendChild(h2);
			this.priceAndDistanceArray.sort( (a,b) => a.timeinsecs-b.timeinsecs); 
			ol= document.createElement('ol'); 
			for (let ele of  this.priceAndDistanceArray){
				let li=document.createElement('li');
				li.innerHTML=`<h5> ${ele.mode} mode of transportation. time taken : ${ele.timeintext}</h5>`; 
				ol.appendChild(li);
			}
			suggestionbox.appendChild(ol);

		})

	}
	//api request 
	route() {
		this.responseObject={};
		this.priceAndDistanceArray=[];
		if (!this.originPlaceId || !this.destinationPlaceId) {
			return;
		};
		document.getElementById('sidebar').style.display="block";
		document.getElementById('map').style.width="70vw";

		//taxi,auto,bike
		this.directionsService.route(
			{
				origin: {
					placeId: this.originPlaceId
				},
				destination: {
					placeId: this.destinationPlaceId
				},
				travelMode: "DRIVING",
			},
			(response, status) => {
				if (status === 'OK') {
					console.log(response);
					let { distance, duration} = response.routes[0].legs[0];
					this.displayDistanceAndPrice('Bike',distance,duration);
					this.displayDistanceAndPrice('Auto',distance,duration)
					this.displayDistanceAndPrice('Taxi',distance,duration);	
					this.responseObject['Taximap']=response; 
					this.responseObject['Automap']=response; 
					this.responseObject['Bikemap']=response;
					this.directionsRenderer.setDirections(response);
	;
			
	 
	
					this.displayDetails(); 

				} else {
					window.alert('Directions request failed due to ' + status);
				}
			}
		);
		//walking 
		this.directionsService.route(
			{
				origin: {
					placeId: this.originPlaceId
				},
				destination: {
					placeId: this.destinationPlaceId
				},
				travelMode: "WALKING", 
			},
			(response, status) => {
				if (status === 'OK') {
					let timeintext = response.routes[0].legs[0].duration.text.replace('hours','h').replace('mins','m').replace('days','d');
					this.responseObject['Walkmap']=response; 
					document.getElementById('Walk').innerHTML=`
					<div class="name-icon">
						<h2>Walk</h2>
						<i id="Walkmap" class="fa fa-male" style='font-size:20px' aria-hidden="true"></i>
					</div>
					<div class="price-time-container">
						<h3><span style="color:#ff66ff;">Duration </span>${timeintext}</h3>
					</div>`

				} else {
					window.alert('Directions request failed due to ' + status);
				}
			}
		);
		//bus
		this.directionsService.route(
			{
				origin: {
					placeId: this.originPlaceId
				},
				destination: {
					placeId: this.destinationPlaceId
				},
				travelMode: "TRANSIT", 
			},
			(response, status) => {
				if (status === 'OK') {
					if (response.routes[0].fare){
						let fare= response.routes[0].fare.value; 
						let Mode='Bus';
						let timeinsecs=  response.routes[0].legs[0].duration.value;
						let timeintext= response.routes[0].legs[0].duration.text.replace('mins','m').replace('hours','h').replace('hour','h');
						this.responseObject['Busmap']=response; 
						document.getElementById('Bus').innerHTML=`
						<div class="name-icon">
							<h2>Bus</h2>
							<i id="Busmap" class='fas fa-bus' style='font-size:20px' aria-hidden="true"></i>
						</div>
						<div class="price-time-container">
						<h3><span style="color:#ff66ff;">Duration </span>${timeintext}</h3>
						<h3><span style="color:#ff66ff;">Price </span>&#8377 ${fare} </h3>
						</div>`
						this.priceAndDistanceArray.push({Mode,fare,timeinsecs,timeintext});
					}else{
						document.getElementById('Bus').innerHTML=`
						<div class="name-icon">
							<h2>Bus</h2>
							<i id="Busmap" class='fas fa-bus' style='font-size:20px' aria-hidden="true"></i>
						</div>
						<div class="price-time-container">
						<h3 style="color:#ff66ff;"> Bus Service is not available </h3>
						</div>`
					}

				} else {
					window.alert('Directions request failed due to ' + status);
				}
			}
		);
		//for displaying map and suggestion for different modes 
		setTimeout(()=>{
			this.setupclickedeventListener();
		},3000);

	}
}
