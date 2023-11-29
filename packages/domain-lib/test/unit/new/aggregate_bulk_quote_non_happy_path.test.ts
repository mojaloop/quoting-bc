 // test("handleBulkQuoteRequestedEvt - should publish error message if participant is invalid", async () => {
    //     const mockedQuote = mockedBulkQuote1;
    //     const payload: BulkQuoteRequestedEvtPayload = createBulkQuoteRequestedEvtPayload(mockedQuote);

    //     const requesterFspId = "payer";
    //     const destinationFspId = "payee";
    //     const fspiopOpaqueState = {
    //         requesterFspId,
    //         destinationFspId,
    //     };

    //     const message: IMessage = createMessage(payload, BulkQuoteRequestedEvt.name,fspiopOpaqueState);

    //     const errorMsg = InvalidParticipantIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		destinationFspId,
    //         requesterFspId,
    //         quoteId: payload.bulkQuoteId,
    //         sourceEvent : BulkQuoteRequestedEvt.name,
	// 	};



    //     jest.spyOn(participantService, "getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "not matching", type: "DFSP", isActive: false} as IParticipant);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });
// #region handleBulkQuotePendingReceivedEvt

    // test("handleBulkQuotePendingReceivedEvt - should send error event if requesterFspId not valid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedBulkQuote1;
    //     const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

    //     const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name, null);

    //     const errorMsg = InvalidRequesterFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:null,
    //         destinationFspId: null,
    //         quoteId: payload.bulkQuoteId,
    //         sourceEvent : BulkQuotePendingReceivedEvt.name,
    //     };

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleBulkQuotePendingReceivedEvt - should send error event if destinationFspId not valid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedBulkQuote1;

    //     const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //     };
    //     const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name,fspiopOpaqueState);

    //     const errorMsg = InvalidDestinationFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:"payer",
    //         destinationFspId: null,
    //         quoteId: payload.bulkQuoteId,
    //         sourceEvent : BulkQuotePendingReceivedEvt.name,
    //     };

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleBulkQuotePendingReceivedEvt - should send error event if couldnt validate requester participant", async () => {
    //     // Arrange
    //     const mockedQuote = mockedBulkQuote1;
    //     const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     };
    //     const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name,fspiopOpaqueState);

    //     const errorMsg = NoSuchParticipantError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:"payer",
    //         destinationFspId: "payee",
    //         quoteId: payload.bulkQuoteId,
    //         sourceEvent : BulkQuotePendingReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValue(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleBulkQuotePendingReceivedEvt - should send error event if couldnt find quote on database", async () => {
    //     // Arrange
    //     const mockedQuote = mockedBulkQuote1;
    //     const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     }
    //     const message: IMessage = createMessage(payload,BulkQuotePendingReceivedEvt.name, fspiopOpaqueState);

    //     const errorMsg = QuoteNotFoundError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:"payer",
    //         destinationFspId: "payee",
    //         quoteId: payload.bulkQuoteId,
    //         sourceEvent : BulkQuotePendingReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(bulkQuoteRepo, "getBulkQuoteById")
    //         .mockResolvedValueOnce(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });