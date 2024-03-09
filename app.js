const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const dataBasePath = path.join(__dirname, 'covid19India.db')
let dataBase = null

const initializationDBAndServer = async () => {
  try {
    dataBase = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializationDBAndServer()

const convertStateDBObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictDBObjectToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

//API 1 GET ALL STATES
app.get('/states/', async (request, response) => {
  const getAllStatesQuery = `
    SELECT * FROM state;`
  const allStates = await dataBase.all(getAllStatesQuery)
  response.send(
    allStates.map(eachStates =>
      convertStateDBObjectToResponseObject(eachStates),
    ),
  )
})

//API 2 GET SPECIFIC STATEID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const stateIdQuery = `
  SELECT * FROM state WHERE state_id = ${stateId};`
  const stateIdResponse = await dataBase.get(stateIdQuery)
  response.send(convertStateDBObjectToResponseObject(stateIdResponse))
})

//API 3 POST DISTRICTS
app.post('/districts/', async (request, response) => {
  const createDistrict = request.body
  const {districtName, stateId, cases, cured, active, deaths} = createDistrict
  const createDistrictQuery = `
  INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
  VALUES
  ("${districtName}",
  "${stateId}",
  "${cases}",
  "${cured}",
  "${active}",
  "${deaths}");`
  const dataBaseResponse = await dataBase.run(createDistrictQuery)
  response.send('District Successfully Added')
})

//API 4 GET SPECIFIC DISTRICTID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtIdQuery = `
  SELECT * FROM district WHERE district_id = ${districtId};`
  const districtIdResponse = await dataBase.get(districtIdQuery)
  response.send(convertDistrictDBObjectToResponseObject(districtIdResponse))
})

//API 5 DELETE DISTRICT
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE FROM district WHERE district_id = ${districtId};`
  await dataBase.run(deleteDistrictQuery)
  response.send('District Removed')
})

//API 6 PUT UPDATE SPECIFIC DISTRICT
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const updateDistrictId = request.body
  const {districtName, stateId, cases, cured, active, deaths} = updateDistrictId
  const updateDistrictIdQuery = `
  UPDATE district
  SET
  district_name = "${districtName}",
  state_id = "${stateId}",
  cases = "${cases}",
  cured = "${cured}",
  active = "${active}",
  deaths = "${deaths}"
  WHERE
  district_id = ${districtId};`
  await dataBase.run(updateDistrictIdQuery)
  response.send('District Details Updated')
})

//GET STATEID STATS
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const stateIdStatsQuery = `
  SELECT 
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM 
  district
  WHERE state_id = ${stateId};`
  const stateStats = await dataBase.get(stateIdStatsQuery)

  console.log(stateStats)

  response.send({
    totalCases: stateStats['SUM(cases)'],
    totalCured: stateStats['SUM(cured)'],
    totalActive: stateStats['SUM(active)'],
    totalDeaths: stateStats['SUM(deaths)'],
  })
})

//GET DISTRICT DETAILS STATE NAME
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const districtStateNameQuery = `
  SELECT state_id FROM district WHERE district_id = ${districtId};`
  const districtStateIdResponse = await dataBase.get(districtStateNameQuery)

  const getStateNameQuery = `
  SELECT state_name AS stateName FROM state 
  WHERE
  state_id = ${districtStateIdResponse.state_id};`
  const getStateNameQueryResponse = await dataBase.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})

module.exports = app
