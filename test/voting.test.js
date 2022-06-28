const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');

const Voting = artifacts.require('./Voting.sol');

contract('Voting', function (accounts) {
  const owner = accounts[0];
  const voter1 = accounts[1];
  const voter2 = accounts[2];
  const notVoter = accounts[3];

  before(async function () {
    this.votingInstance = await Voting.new({ from: owner });
  });

  describe('RegisteringVoters flow', function () {
    it('should add voters', async function () {
      const receipt1 = await this.votingInstance.addVoter(voter1, {
        from: owner,
      });
      expectEvent(receipt1, 'VoterRegistered', { voterAddress: voter1 });

      const receipt2 = await this.votingInstance.addVoter(voter2, {
        from: owner,
      });
      expectEvent(receipt2, 'VoterRegistered', { voterAddress: voter2 });

      const registeredVoter1 = await this.votingInstance.voters(voter1);
      const registeredVoter2 = await this.votingInstance.voters(voter2);

      expect(
        registeredVoter1.isRegistered && registeredVoter2.isRegistered
      ).to.be.true;
    });

    it('should fail adding voters if not owner', async function () {
      await expectRevert.unspecified(
        this.votingInstance.addVoter(notVoter, { from: voter2 })
      );
    });
  });

  describe('ProposalsRegistration flow', function () {
    it('should fail if startProposalRegistration flow has not started', async function () {
      await expectRevert.unspecified(
        this.votingInstance.addProposal('Proposal 1', { from: voter1 })
      );
    });

    it('should start ProposalsRegistration flow', async function () {
      const receiptStartProposals =
        await this.votingInstance.startProposalRegistration({ from: owner });
      expectEvent(receiptStartProposals, 'WorkflowStatusChange', {
        previousStatus: new BN(0),
        newStatus: new BN(1),
      });
    });

    it('should add proposals', async function () {
      const receiptProposal1 = await this.votingInstance.addProposal(
        'Proposal 1',
        { from: voter1 }
      );
      expectEvent(receiptProposal1, 'ProposalRegistered', {
        proposalId: new BN(0),
      });

      const receiptProposal2 = await this.votingInstance.addProposal(
        'Proposal 2',
        { from: voter2 }
      );
      expectEvent(receiptProposal2, 'ProposalRegistered', {
        proposalId: new BN(1),
      });
    });

    it('should fail if non voter add proposals', async function () {
      await expectRevert.unspecified(
        this.votingInstance.addProposal('Proposal 3', { from: owner })
      );
    });
  });
});
