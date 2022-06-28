const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Voting = artifacts.require('./Voting.sol');

contract('Voting', function (accounts) {
  const owner = accounts[0];
  const voter1 = accounts[1];
  const voter2 = accounts[2];
  const notVoter = accounts[3];

  const proposals = [
    {
      id: new BN(0),
      val: 'Proposal 1',
    },
    {
      id: new BN(1),
      val: 'Proposal 2',
    },
  ];

  const workflowStatus = {
    RegisteringVoters: new BN(0),
    ProposalsRegistrationStarted: new BN(1),
    ProposalsRegistrationEnded: new BN(2),
    VotingSessionStarted: new BN(3),
    VotingSessionEnded: new BN(4),
    VotesTallied: new BN(5),
  };

  before(async function () {
    this.votingInstance = await Voting.new({ from: owner });
  });

  describe('RegisteringVoters', function () {
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

  describe('ProposalsRegistration', function () {
    it('should fail if startProposalRegistration flow has not started', async function () {
      await expectRevert.unspecified(
        this.votingInstance.addProposal('Proposal 1', { from: voter1 })
      );
    });

    it('should start ProposalsRegistration flow', async function () {
      const receiptStartProposals =
        await this.votingInstance.startProposalRegistration({ from: owner });
      expectEvent(receiptStartProposals, 'WorkflowStatusChange', {
        previousStatus: workflowStatus.RegisteringVoters,
        newStatus: workflowStatus.ProposalsRegistrationStarted,
      });
    });

    it('should add proposals', async function () {
      const receiptProposal1 = await this.votingInstance.addProposal(
        proposals[0].val,
        { from: voter1 }
      );
      expectEvent(receiptProposal1, 'ProposalRegistered', {
        proposalId: proposals[0].id,
      });

      const receiptProposal2 = await this.votingInstance.addProposal(
        proposals[1].val,
        { from: voter2 }
      );
      expectEvent(receiptProposal2, 'ProposalRegistered', {
        proposalId: proposals[1].id,
      });
    });

    it('should fail if non voter add proposals', async function () {
      await expectRevert.unspecified(
        this.votingInstance.addProposal('Proposal 3', { from: owner })
      );
    });

    it('should end proposals registration', async function () {
      const receiptEndProposals =
        await this.votingInstance.endProposalRegistration({ from: owner });
      expectEvent(receiptEndProposals, 'WorkflowStatusChange', {
        previousStatus: workflowStatus.ProposalsRegistrationStarted,
        newStatus: workflowStatus.ProposalsRegistrationEnded,
      });

      await expectRevert.unspecified(
        this.votingInstance.addProposal('Proposal 4', { from: voter1 })
      );
    });
  });

  describe('VotingSession', function () {
    it('should fail if VotingSessionStarted flow has not started', async function () {
      await expectRevert.unspecified(
        this.votingInstance.vote(proposals[1].id, { from: voter1 })
      );
    });

    it('should add votes', async function () {
      const receiptStartVoting = await this.votingInstance.startVotingSession({
        from: owner,
      });

      expectEvent(receiptStartVoting, 'WorkflowStatusChange', {
        previousStatus: workflowStatus.ProposalsRegistrationEnded,
        newStatus: workflowStatus.VotingSessionStarted,
      });

      const receiptVotedVoter1 = await this.votingInstance.vote(
        proposals[1].id,
        { from: voter1 }
      );
      expectEvent(receiptVotedVoter1, 'Voted', {
        voter: voter1,
        proposalId: proposals[1].id,
      });

      const receiptVotedVoter2 = await this.votingInstance.vote(
        proposals[1].id,
        { from: voter2 }
      );
      expectEvent(receiptVotedVoter2, 'Voted', {
        voter: voter2,
        proposalId: proposals[1].id,
      });
    });

    it('should not be able to vote twice', async function () {
      await expectRevert(
        this.votingInstance.vote(proposals[0].id, { from: voter1 }),
        'Already voted.'
      );
    });

    it('should not be able to vote if not voter', async function () {
      await expectRevert.unspecified(
        this.votingInstance.vote(proposals[0].id, { from: notVoter })
      );
    });

    it('should end voting session', async function () {
      const receiptEndVoting = await this.votingInstance.endVotingSession({
        from: owner,
      });
      expectEvent(receiptEndVoting, 'WorkflowStatusChange', {
        previousStatus: workflowStatus.VotingSessionStarted,
        newStatus: workflowStatus.VotingSessionEnded,
      });
    });
  });

  describe('TallyVotes', function () {
    it('should not show winner if votes not tallied', async function () {
      await expectRevert.unspecified(this.votingInstance.getWinner());
    });

    it('should tally votes', async function () {
      const receiptTalliedVotes = await this.votingInstance.tallyVotes({
        from: owner,
      });
      expectEvent(receiptTalliedVotes, 'WorkflowStatusChange', {
        previousStatus: workflowStatus.VotingSessionEnded,
        newStatus: workflowStatus.VotesTallied,
      });
    });

    it('should get winner', async function () {
      const winner = await this.votingInstance.getWinner();
      expect(winner.description).to.equal(proposals[1].val);
    });
  });
});
