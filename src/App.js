import React from "react";
import { Takeaway } from "takeaway-mod";
import Dialog from "@material-ui/core/Dialog";
import Drawer from "@material-ui/core/Drawer";
import Checkbox from "@material-ui/core/Checkbox";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import Box from "@material-ui/core/Box";
import Badge from "@material-ui/core/Badge";
import List from "@material-ui/core/List";
import Fab from "@material-ui/core/Fab";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import GpsFixedIcon from "@material-ui/icons/GpsFixed";
import ShoppingBasketIcon from "@material-ui/icons/ShoppingBasket";
import Geocode from "react-geocode";
import { geolocated } from "react-geolocated";
require('dotenv').config()
Geocode.setApiKey(process.env.API_KEY);
function precise(x, y) {
  return Number.parseFloat(x).toPrecision(y);
}
function getUnique(arr, comp) {
  const unique = arr
    .map(e => e[comp])

    // store the keys of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)

    // eliminate the dead keys & store unique objects
    .filter(e => arr[e])
    .map(e => arr[e]);

  return unique;
}
class Root extends React.Component {
  constructor(props) {
    super(props);
    this.executeSearch = this.executeSearch.bind(this);
    this.sortUp = this.sortUp.bind(this);
    this.sortDown = this.sortDown.bind(this);
  }
  state = {
    basketOpen: false,
    order: [],
    latData: 0,
    lngData: 0,
    filterOpen: false,
    filterValue: "",
    postalCode: "",
    pizzas: [],
    pizzasLength: 0,
    restaurantsLength: 0,
    bestToWorst: null,
    loadingDone: true,
    globalIngredients: [],
    unwanted: []
  };

  calculateVariable(myString, cost) {
    let indexOfDemarkation = myString.indexOf("[");
    let splicedName = myString.slice(indexOfDemarkation);
    let nameFilteredOnce = splicedName.replace("[", "");
    let nameFilteredTwice = nameFilteredOnce.replace("]", "");
    let nameFilteredThird = nameFilteredTwice.replace(" ", "");
    let nameFilteredFourth = nameFilteredThird.replace("cm", "");
    let rawNumber = nameFilteredFourth.slice(
      nameFilteredFourth.search(/[0-9]/g)
    );
    let costToMonetaryValue = cost / 100;
    let rawVariable = (3.14 * (rawNumber ^ 2)) / costToMonetaryValue;
    return precise(rawVariable, 3);
  }
  sortUp() {
    let items = this.state.pizzas;
    let newItems = items.sort(function(a, b) {
      return a.variable - b.variable;
    });
    this.setState({ pizzas: newItems.reverse(), bestToWorst: true });
  }
  sortDown() {
    let items = this.state.pizzas;
    let newItems = items.sort(function(a, b) {
      return a.variable - b.variable;
    });
    this.setState({ pizzas: newItems, bestToWorst: false });
  }

  executeSearch() {
    this.setState({
      globalIngredients: [],
      pizzas: [],
      pizzasLength: 0,
      restaurantsLength: 0,
      bestToWorst: null
    });
    let latData = 0;
    let lngData = 0;
    (async () => {
      try {
        Geocode.fromAddress(this.state.postalCode).then(
          response => {
            const { lat, lng } = response.results[0].geometry.location;
            latData = lat;
            lngData = lng;
          },
          error => {
            console.error(error);
          }
        );
      } catch (err) {
        console.error(err);
      }
    })();
    this.setState({ loadingDone: false, latData: latData, lngData: lngData });
    let pizzas = [];
    let restaurantsList = [];
    (async () => {
      try {
        const takeaway = new Takeaway();

        const country = await takeaway.getCountryById("PL");
        const restaurants = await country.getRestaurants("", latData, lngData);

        for (const restaurant of restaurants) {
          await restaurant.getMenu(latData, lngData);
          if (restaurant.categories) {
            for (const category of restaurant.categories) {
              for (const product of category.products) {
                if (
                  product.name &&
                  product.name.toLowerCase().includes("pizza") &&
                  (product.name.toLowerCase().includes("cm") ||
                    (product.options[0] &&
                      product.options[0].choices[0].data.name
                        .toLowerCase()
                        .includes("cm")))
                ) {
                  if (!restaurantsList.includes(restaurant)) {
                    restaurantsList.push(restaurant);
                  }
                  pizzas.push({
                    product: product,
                    ingredients: this.parseIngredients(
                      product.data.description
                    ),
                    from: restaurant.name,
                    variable: this.calculateVariable(
                      product.data.name,
                      product.data.deliveryPrice
                    )
                  });
                  this.setState({
                    pizzasLength: pizzas.length,
                    restaurantsLength: restaurantsList.length
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        let globalIngredients = [];

        pizzas.forEach(item => {
          item.ingredients.forEach(ingredient => {
            if (
              !globalIngredients.includes({ name: ingredient, checked: true })
            ) {
              globalIngredients.push({ name: ingredient, checked: true });
            }
          });
        });

        this.setState({
          pizzas: pizzas,
          loadingDone: true,
          globalIngredients: getUnique(globalIngredients, "name")
        });
      }
    })();
  }
  // innerRef;
  // getInnerRef(ref) {
  //   this.innerRef = ref;
  // }
  //
  // getLocation() {
  //   this.innerRef && this.innerRef.getLocation();
  // }
  executeSearchGps() {
    this.setState({
      globalIngredients: [],
      postalCode: "📍 Twoja lokalizacja 📍",
      pizzas: [],
      pizzasLength: 0,
      restaurantsLength: 0,
      bestToWorst: null
    });
    //this.getInnerRef()
    //  alert(JSON.stringify(this.getLocation()))
    let latData = this.props.coords.latitude;
    let lngData = this.props.coords.longitude;
    this.setState({ loadingDone: false, latData: latData, lngData: lngData });
    let pizzas = [];
    let restaurantsList = [];
    (async () => {
      try {
        const takeaway = new Takeaway();

        const country = await takeaway.getCountryById("PL");
        const restaurants = await country.getRestaurants("", latData, lngData);

        for (const restaurant of restaurants) {
          await restaurant.getMenu(latData, lngData);

          if (restaurant.categories) {
            for (const category of restaurant.categories) {
              for (const product of category.products) {
                if (
                  product.name &&
                  product.name.toLowerCase().includes("pizza") &&
                  (product.name.toLowerCase().includes("cm") ||
                    (product.options[0] &&
                      product.options[0].choices[0].data.name
                        .toLowerCase()
                        .includes("cm")))
                ) {
                  if (!restaurantsList.includes(restaurant)) {
                    restaurantsList.push(restaurant);
                  }
                  pizzas.push({
                    product: product,
                    ingredients: this.parseIngredients(
                      product.data.description
                    ),
                    from: restaurant.name,
                    variable: this.calculateVariable(
                      product.data.name,
                      product.data.deliveryPrice
                    )
                  });

                  this.setState({
                    pizzasLength: pizzas.length,
                    restaurantsLength: restaurantsList.length
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        let globalIngredients = [];

        pizzas.forEach(item => {
          item.ingredients.forEach(ingredient => {
            if (
              !globalIngredients.includes({ name: ingredient, checked: true })
            ) {
              globalIngredients.push({ name: ingredient, checked: true });
            }
          });
        });

        this.setState({
          pizzas: pizzas,
          loadingDone: true,
          globalIngredients: getUnique(globalIngredients, "name"),
          latData: latData,
          lngData: lngData
        });
      }
    })();
  }
  parseIngredients(description) {
    let string = description.replace(/ i /, ", ");
    let string2 = string.replace(". ", ", ");
    let array = string2.slice(2).split(", ");
    let list = [];
    array.forEach(item => list.push("z " + item));
    return list;
  }
  render() {
    return (
      <Dialog
        PaperProps={{ style: { overflow: "hidden" } }}
        open={true}
        fullScreen
      >
        <DialogContent
          style={{
            textAlign: "center"
          }}
        >
          <Box boxShadow={4}>
            <DialogTitle style={{ paddingBottom: 0 }}>
              Kalkulator opłacalności pizzy
            </DialogTitle>
            <br />
            <Typography variant="subtitle2">Made by Daks</Typography>

            <TextField
              inputProps={{
                style: { textAlign: "center", fontSize: "larger" }
              }}
              style={{ width: "70%", paddingTop: 50 }}
              placeholder="Wpisz adres / Kod pocztowy"
              value={this.state.postalCode}
              onFocus={
                this.state.postalCode === "📍 Twoja lokalizacja 📍" &&
                (() => this.setState({ postalCode: "" }))
              }
              onChange={event =>
                this.setState({ postalCode: event.target.value })
              }
            />
            <br />

            <Button
              style={{ padding: 16, margin: 16, fontSize: "large" }}
              color="primary"
              variant="contained"
              onClick={() => this.executeSearch(this.state.postalCode)}
            >
              Wyszukaj i oblicz
            </Button>
            <Button
              style={{ padding: 16, margin: 16, fontSize: "large" }}
              color="primary"
              variant="contained"
              onClick={() => {
                this.executeSearchGps(this.state.postalCode);
              }}
            >
              <GpsFixedIcon />
            </Button>
            <br />
            {/*  <Button
            disabled={this.state.pizzas.length === 0}
            onClick={() => console.debug(this.state.pizzas)}
          >
            Debug (dump pizza array to console)
          </Button>*/}
            <br />

            <Drawer
              anchor="left"
              onClose={() =>
                this.setState({ filterOpen: !this.state.filterOpen })
              }
              PaperProps={{ style: { width: 250 } }}
              open={this.state.filterOpen}
            >
              <Button
                onClick={() =>
                  this.setState({ filterOpen: !this.state.filterOpen })
                }
              >
                Zamknij filtr
              </Button>
              <TextField
                style={{ padding: 16 }}
                placeholder="Wyszukaj składnik"
                value={this.state.filterValue}
                onChange={event =>
                  this.setState({ filterValue: event.target.value })
                }
              />

              <List>
                {this.state.loadingDone &&
                  this.state.globalIngredients.length > 0 &&
                  this.state.globalIngredients.map((item, index) => (
                    <React.Fragment>
                      <ListItem
                        style={{
                          display:
                            !item.name.includes(this.state.filterValue) &&
                            "none"
                        }}
                      >
                        <Checkbox
                          checked={item.checked}
                          onChange={() => {
                            let newState = this.state;
                            newState.globalIngredients[
                              index
                            ].checked = !item.checked;
                            newState.unwanted = newState.globalIngredients.filter(
                              filtered => {
                                return !filtered.checked;
                              }
                            );
                            this.setState({ newState });
                          }}
                        />
                        <ListItemText primary={item.name} />
                      </ListItem>
                    </React.Fragment>
                  ))}
              </List>
            </Drawer>
            <Drawer
              anchor="right"
              onClose={() =>
                this.setState({ basketOpen: !this.state.basketOpen })
              }
              PaperProps={{ style: { width: 250 } }}
              open={this.state.basketOpen}
            >
              <Button
                onClick={() =>
                  this.setState({ basketOpen: !this.state.basketOpen })
                }
              >
                Zamknij koszyk
              </Button>

              <List>
                {this.state.order.length > 0 &&
                  this.state.order.map((item, index) => (
                    <React.Fragment>
                      <ListItem
                        button
                        onClick={() => {
                          let newOrder = this.state.order.filter(dish => {
                            return dish !== item;
                          });
                          this.setState({ order: newOrder });
                        }}
                        style={{
                          backgroundColor: index % 2 !== 0 ? "#fff" : "#eee"
                        }}
                      >
                        <ListItemText
                          style={{ textAlign: "start" }}
                          primary={item.product.data.name + " - " + item.from}
                          secondary={item.product.data.description}
                        />
                        <ListItemText
                          style={{ textAlign: "end" }}
                          primary={item.variable + "cm2 / 1zł"}
                          secondary={
                            "Całkowity Koszt: " +
                            item.product.data.deliveryPrice / 100 +
                            "zł"
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
              </List>
              <Typography variant="button">
                Całkowity koszt zamówienia razem z dostawą =
                <b>
                  {" "}
                  {this.state.order.length > 0
                    ? this.state.order.reduce(function(prev, cur) {
                        return prev + cur.product.data.deliveryPrice / 100;
                      }, 0)
                    : 0}
                  zł
                </b>
              </Typography>
            </Drawer>
            {this.state.loadingDone && this.state.pizzas.length > 0 && (
              <Typography variant="h6">
                {this.state.pizzasLength} wyświetlanych pozycji z{" "}
                {this.state.restaurantsLength} restauracji
              </Typography>
            )}
            <br />
            {this.state.pizzas.length !== 0 && (
              <div>
                <Button
                  variant="outlined"
                  style={{
                    backgroundColor:
                      this.state.bestToWorst === true && "#b5b5b5"
                  }}
                  onClick={() => this.sortUp()}
                >
                  ↑ Od Najlepszych ↑
                </Button>{" "}
                <Button
                  variant="outlined"
                  onClick={() =>
                    this.setState({ filterOpen: !this.state.filterOpen })
                  }
                >
                  <b> Otwórz filtr </b>
                </Button>{" "}
                <Button
                  variant="outlined"
                  style={{
                    backgroundColor:
                      this.state.bestToWorst === false && "#b5b5b5"
                  }}
                  onClick={() => this.sortDown()}
                >
                  ↓ Od Najgorszych ↓
                </Button>
              </div>
            )}
          </Box>

          <List>
            {this.state.loadingDone &&
              this.state.pizzas.length > 0 &&
              this.state.pizzas.map((item, index) => (
                <React.Fragment>
                  {!this.state.unwanted.some(r =>
                    item.ingredients.includes(r.name)
                  ) && (
                    <ListItem
                      button
                      onClick={() => {
                        if (!this.state.order.includes(item)) {
                          let newState = this.state;
                          newState.order.push(item);
                          this.setState({ newState });
                        } else {
                          let newOrder = this.state.order.filter(dish => {
                            return dish !== item;
                          });
                          this.setState({ order: newOrder });
                        }
                      }}
                      key={index}
                      style={{
                        backgroundColor: this.state.order.includes(item)
                          ? index % 2 !== 0
                            ? "#bbdefb"
                            : "#90caf9"
                          : index % 2 !== 0
                          ? "#fff"
                          : "#eee"
                      }}
                    >
                      <ListItemText
                        style={{ textAlign: "start" }}
                        primary={item.product.data.name + " - " + item.from}
                        secondary={item.product.data.description}
                      />
                      <ListItemText
                        style={{ textAlign: "end" }}
                        primary={item.variable + "cm2 / 1zł"}
                        secondary={
                          "Całkowity Koszt: " +
                          item.product.data.deliveryPrice / 100 +
                          "zł"
                        }
                      />
                    </ListItem>
                  )}
                </React.Fragment>
              ))}
            {!this.state.loadingDone && this.state.pizzas.length === 0 && (
              <div style={{ paddingTop: 30 }}>
                <div>
                  <CircularProgress style={{ width: "10%", height: "10%" }} />
                </div>
                <div style={{ paddingTop: 30 }}>
                  <Typography variant="h5">
                    Trwa ładowanie. Do tej pory załadowano{" "}
                    {this.state.pizzasLength} pozycji z{" "}
                    {this.state.restaurantsLength} restauracji
                  </Typography>
                </div>
              </div>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Typography
            style={{
              position: "absolute",
              color: "#666",
              top: 1,
              right: 2,
              fontSize: "10px"
            }}
          >
            0.7v
          </Typography>

          <Fab
            onClick={() =>
              this.setState({ basketOpen: !this.state.basketOpen })
            }
            style={{ position: "absolute", bottom: 16, right: 16 }}
            color="primary"
          >
            <Badge
              color="secondary"
              invisible={this.state.order.length === 0}
              badgeContent={this.state.order.length}
            >
              <ShoppingBasketIcon />
            </Badge>
          </Fab>
        </DialogActions>
      </Dialog>
    );
  }
}

export default geolocated({
  positionOptions: {
    enableHighAccuracy: false
  },
  userDecisionTimeout: 5000,
  suppressLocationOnMount: false
})(Root);
