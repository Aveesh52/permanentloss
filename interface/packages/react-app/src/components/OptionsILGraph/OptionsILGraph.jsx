import { useQuery } from '@apollo/react-hooks';
import { EtherscanProvider, Web3Provider } from '@ethersproject/providers';
import { abis } from '@permanentloss-interface/contracts';
import { Contract } from 'ethers';
import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import GET_OPYN_V1_OPTIONS_CONTRACTS from '../../graphql/opynv1subgraph';
import { getEthOptions, getImpermanentLossPoints } from './utils';

function OptionsILGraph({
  web3Provider,
  ethPrice,
  ethPortfolioSize,
  setSelectedPut,
  setSelectedCall,
}) {
  const [putOptions, setPutOptions] = useState([]);
  const [callOptions, setCallOptions] = useState([]);

  const [optionsContracts, setOptionsContracts] = useState([]);

  const { loading, error, data } = useQuery(GET_OPYN_V1_OPTIONS_CONTRACTS);

  useEffect(() => {
    if (!loading && !error && data && data.optionsContracts) {
      setOptionsContracts(data.optionsContracts);
    }
  }, [loading, error, data, optionsContracts]);

  const OPYN_UNISWAP_EXCHANGE = '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95';

  const opynUniswapContract = useMemo(
    () =>
      new Contract(OPYN_UNISWAP_EXCHANGE, abis.uniswapv1_factory, web3Provider),
    [web3Provider]
  );

  useEffect(() => {
    const gimmeOptions = async () => {
      const options = await getEthOptions(
        web3Provider,
        ethPrice,
        ethPortfolioSize,
        opynUniswapContract,
        true,
        optionsContracts
      );
      if (options !== null) {
        setPutOptions(options);
      }
    };
    gimmeOptions();
  }, [
    opynUniswapContract,
    web3Provider,
    ethPrice,
    ethPortfolioSize,
    optionsContracts,
  ]);

  useEffect(() => {
    const gimmeOptions = async () => {
      const options = await getEthOptions(
        web3Provider,
        ethPrice,
        ethPortfolioSize,
        opynUniswapContract,
        false,
        optionsContracts
      );
      if (options !== null) {
        setCallOptions(options);
      }
    };
    gimmeOptions();
  }, [
    opynUniswapContract,
    web3Provider,
    ethPrice,
    ethPortfolioSize,
    optionsContracts,
  ]);

  const impermanentLossPoints = getImpermanentLossPoints();
  const impermanentLossPlotData = {
    x: impermanentLossPoints[0],
    y: impermanentLossPoints[1],
    type: 'scatter',
    mode: 'lines',
    name: 'IP Loss',
    line: { shape: 'spline', smoothing: 0.5 },
    marker: { color: 'blue' },
  };

  const putOptionPlotData = {
    x: putOptions.x,
    y: putOptions.y,
    customdata: putOptions.meta,
    name: `Put Price for ${ethPortfolioSize} ETH`,
    yaxis: 'y2',
    type: ' scatter',
    marker: { color: 'green' },
  };

  const callOptionPlotData = {
    x: callOptions.x,
    y: callOptions.y,
    customdata: callOptions.meta,
    name: `Call Price for ${ethPortfolioSize} ETH`,
    yaxis: 'y3',
    type: ' scatter',
    marker: { color: 'orange' },
  };

  const layout = {
    responsive: true,
    title: 'Impermanent Loss',
    xaxis: {
      title: 'ETH Value',
      tickformat: ',.0%',
    },
    yaxis: {
      title: 'Δ Value',
      tickformat: ',.0%',
    },
    yaxis2: {
      title: 'oToken Price',
      overlaying: 'y',
      side: 'right',
    },
    yaxis3: {
      title: 'oToken Price',
      overlaying: 'y',
      side: 'right',
    },
  };

  function handlePlotClick(pointsAndEvent) {
    const closestCurve = pointsAndEvent.points[0];
    if (closestCurve.customdata) {
      const _data = closestCurve.customdata;
      console.log(`user clicked: ${JSON.stringify(_data)}`);
      if (_data.strikePriceAsPercentDrop > 1) {
        setSelectedCall(_data);
      } else {
        setSelectedPut(_data);
      }
    }
  }

  return (
    <Plot
      data={[impermanentLossPlotData, putOptionPlotData, callOptionPlotData]}
      layout={layout}
      onClick={handlePlotClick}
    />
  );
}

OptionsILGraph.propTypes = {
  web3Provider: PropTypes.oneOfType([
    PropTypes.instanceOf(Web3Provider),
    PropTypes.instanceOf(EtherscanProvider),
  ]).isRequired,
  ethPrice: PropTypes.number.isRequired,
  ethPortfolioSize: PropTypes.number.isRequired,
  setSelectedPut: PropTypes.func.isRequired,
  setSelectedCall: PropTypes.func.isRequired,
};

export default OptionsILGraph;
